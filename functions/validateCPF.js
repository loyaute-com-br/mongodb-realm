exports = async function validateCPF(cpf) {
  // Remove all non-numeric characters (except digits) from the CPF string
  cpf = cpf.replace(/[^\d]+/g,'');

  // Check if the CPF has the correct length (11 digits)
  if (cpf.length !== 11) {
    return false;
  }

  // Check if all digits of the CPF are equal
  if (/^(\d)\1+$/.test(cpf)) {
    return false;
  }

  // Calculate the first verification digit using the CPF validation algorithm
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = sum % 11;
  let digit1 = (remainder < 2) ? 0 : 11 - remainder;

  // Calculate the second verification digit using the same algorithm
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = sum % 11;
  let digit2 = (remainder < 2) ? 0 : 11 - remainder;

  // Check if the calculated verification digits match the last two digits of the provided CPF
  return ((digit1 == cpf.charAt(9)) && (digit2 == cpf.charAt(10)));
}