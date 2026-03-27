import { gasProvider, GAS_URL, callGAS } from '../providers/gasProvider';
import { seedData } from '../providers/mockProvider';

export async function initialSyncToGAS() {
  const stored = localStorage.getItem('lms_data');
  let data;
  try {
    data = stored ? JSON.parse(stored) : seedData();
  } catch (e) {
    console.error("Error parsing stored data:", e);
    data = seedData();
  }
  
  console.log('Starting sync to Google Sheets...');
  
  try {
    await callGAS('sync_all', data);
    console.log('Sync completed successfully!');
  } catch (error) {
    console.error('Failed to sync all data:', error);
    throw error;
  }
}
