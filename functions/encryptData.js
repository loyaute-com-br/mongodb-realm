exports = async function encryptData(data){
  const crypto = require('crypto');

  const key = 'banana';
  
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encryptedData = cipher.update(data, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  
  return encryptedData;
}