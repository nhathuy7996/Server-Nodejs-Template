import { Low } from 'lowdb'
import { JSONFile, JSONFilePreset } from 'lowdb/node' 


interface Data {
    
}


// File lưu dữ liệu
const adapter = new JSONFile<Data>("db.json"); 

export const db = new Low<Data>(adapter, { users: [] }); 

