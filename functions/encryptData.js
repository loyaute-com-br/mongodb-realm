const crypto = require('crypto');

exports = async function encryptData(data){
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encryptedData = cipher.update(data, 'utf-8', 'hex');
  encryptedData += cipher.final('hex');
  return encryptedData;
}