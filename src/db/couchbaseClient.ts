import couchbase, { Cluster, Bucket, Collection, DocumentNotFoundError } from 'couchbase'; 
import dotenv from "dotenv"; 

dotenv.config();

let cluster: Cluster;
let bucket: Bucket;

let dataCollection: Collection; 

export async function connectToCouchbase() {
    try {
        // Kết nối với Couchbase Cluster
        cluster = await Cluster.connect(`couchbase://${process.env.COUCHBASE_URL || '165.22.240.52'}`, {
            username: process.env.COUCHBASE_USERNAME || 'nhat.huy.7996@gmail.com',
            password: process.env.COUCHBASE_PASSWORD || 'oc3qKtHXELXL',
        });
    
        // Lấy bucket từ cluster
        bucket = cluster.bucket(process.env.COUCHBASE_BUCKET || 'buildAnArmy');

        //Get collection 
        dataCollection = bucket.collection('users'); 
        
        
        console.log('✅ Connected to Couchbase');
      } catch (err) {
        console.error('❌ Failed to connect to Couchbase:', err);
      } 
}

/*
* query Data from couchbase
* @param query: string
* @returns array of rows
*/
export async function queryData(query: string){
    try {
        const result = await cluster.query(query);
        return result.rows; // Return array of rows
      } catch (err) {
        console.error('Error executing query:', err);
        throw new Error('Failed to fetch top users');
      }
}

export function getCouchbaseUsersCollection(): Collection {
  if (!dataCollection) {
    throw new Error('Couchbase is not connected. Call connectToCouchbase first.');
  }
  return dataCollection;
}
