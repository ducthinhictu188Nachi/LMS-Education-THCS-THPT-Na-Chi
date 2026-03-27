/**
 * Google Apps Script - LMS Web API
 * Biến Google Sheet thành một Web API cho hệ thống LMS
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('LMS Admin')
      .addItem('Thiết lập Database (Setup)', 'setupDatabase')
      .addToUi();
}

/**
 * Hàm thiết lập cấu trúc Database ban đầu
 * Tạo các tabs và headers nếu chưa tồn tại
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var schema = {
    'users': ['id', 'username', 'password', 'fullName', 'role', 'classId', 'dob', 'xp', 'level', 'badges'],
    'classes': ['id', 'name', 'grade', 'teacherId', 'teacherName', 'academicYear'],
    'subjects': ['id', 'name', 'description'],
    'topics': ['id', 'subjectId', 'name', 'order'],
    'lessons': ['id', 'topicId', 'title', 'content', 'videoUrl', 'pptUrl', 'order', 'status', 'grade', 'classId', 'interactiveContent'],
    'assignments': ['id', 'lessonId', 'title', 'description', 'dueDate', 'grade', 'classId', 'subjectId', 'topicId', 'studentIds', 'attachments', 'questions', 'rubricJson'],
    'bank_questions': ['id', 'type', 'difficulty', 'content', 'options', 'correctAnswer', 'subQuestions', 'points', 'explanation', 'subjectId', 'topicId', 'createdAt'],
    'tests': ['id', 'title', 'topicId', 'durationMinutes', 'startTime', 'endTime', 'questions', 'assignedTo', 'createdAt'],
    'submissions': ['id', 'assignmentId', 'testId', 'studentId', 'content', 'submittedAt', 'score', 'feedback', 'fileName', 'fileUrl'],
    'announcements': ['id', 'target', 'title', 'content', 'createdAt', 'authorId'],
    'progresses': ['id', 'studentId', 'lessonId', 'completed', 'completedAt', 'lastAccessed', 'quizScores', 'teacherFeedback'],
    'reports': ['id', 'type', 'title', 'dataJson', 'createdAt', 'authorId']
  };
  
  for (var sheetName in schema) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, schema[sheetName].length).setValues([schema[sheetName]]);
      sheet.setFrozenRows(1);
      // Format header
      sheet.getRange(1, 1, 1, schema[sheetName].length)
           .setBackground('#4a86e8')
           .setFontColor('white')
           .setFontWeight('bold');
    } else {
      // Nếu sheet đã tồn tại, kiểm tra và bổ sung headers thiếu
      var lastCol = Math.max(1, sheet.getLastColumn());
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var missingHeaders = schema[sheetName].filter(function(h) {
        return existingHeaders.indexOf(h) === -1;
      });
      
      if (missingHeaders.length > 0) {
        var newHeaders = existingHeaders.concat(missingHeaders);
        sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
        // Format new headers
        sheet.getRange(1, 1, 1, newHeaders.length)
             .setBackground('#4a86e8')
             .setFontColor('white')
             .setFontWeight('bold');
      }
    }
  }
  
  if (typeof SpreadsheetApp.getUi !== 'undefined') {
    SpreadsheetApp.getUi().alert('Thiết lập Database thành công!');
  }
}

function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var payload = requestData.payload;
    
    var result;
    
    switch (action) {
      case 'fetch_all':
        result = fetchAllData();
        break;
      case 'upsert_record':
        result = upsertRecord(payload.table, payload.record);
        break;
      case 'delete_record':
        result = deleteRecord(payload.table, payload.id);
        break;
      case 'sync_table':
        result = syncTable(payload.table, payload.data);
        break;
      default:
        // Fallback for older actions
        if (action === 'classes.list') result = listData('classes');
        else if (action === 'students.add') result = upsertRecord('users', payload);
        else if (action === 'assignments.create') result = upsertRecord('assignments', payload);
        else if (action === 'submissions.grade') result = upsertRecord('submissions', { id: payload.id, score: payload.grade, feedback: payload.feedback });
        else throw new Error('Action không hợp lệ: ' + action);
    }
    
    return createJsonResponse({ ok: true, data: result });
    
  } catch (error) {
    return createJsonResponse({ ok: false, error: error.toString() });
  }
}

/**
 * Lấy toàn bộ dữ liệu từ tất cả các sheets
 */
function fetchAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var allData = {};
  
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    allData[name] = listData(name);
  });
  
  return allData;
}

/**
 * Cập nhật hoặc thêm mới một bản ghi
 */
function upsertRecord(tableName, record) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tableName);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + tableName);
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf('id');
  
  if (idIndex === -1) throw new Error('Cột "id" không tồn tại trong sheet: ' + tableName);
  
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][idIndex] == record.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowValues = headers.map(function(header) {
    var val = record[header];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  
  return record;
}

/**
 * Xóa một bản ghi theo ID
 */
function deleteRecord(tableName, id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tableName);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + tableName);
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf('id');
  
  if (idIndex === -1) throw new Error('Cột "id" không tồn tại trong sheet: ' + tableName);
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][idIndex] == id) {
      sheet.deleteRow(i + 1);
      return { id: id, status: 'deleted' };
    }
  }
  
  return { id: id, status: 'not_found' };
}

/**
 * Đồng bộ toàn bộ bảng (ghi đè)
 */
function syncTable(tableName, dataList) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tableName);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + tableName);
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Xóa dữ liệu cũ (giữ lại header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  if (dataList && dataList.length > 0) {
    var values = dataList.map(function(record) {
      return headers.map(function(header) {
        var val = record[header];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });
    });
    
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
  
  return { count: dataList.length };
}

/**
 * Lớp xử lý dữ liệu (Database Layer)
 */
function listData(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      var val = row[index];
      // Tự động parse JSON nếu là string dạng JSON
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          obj[header] = JSON.parse(val);
        } catch (e) {
          obj[header] = val;
        }
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });
}

/**
 * Xử lý CORS và trả về JSON
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Hàm doGet để kiểm tra trạng thái API
 */
function doGet(e) {
  return createJsonResponse({ ok: true, message: 'LMS API is running' });
}
