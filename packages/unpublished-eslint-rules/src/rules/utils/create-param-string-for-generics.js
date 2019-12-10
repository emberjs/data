// nice conventional naming schemes for using <= 4 generics
const TypeParamNamingSchema = [['T'], ['K', 'V'], ['T', 'K', 'V'], ['T', 'K', 'V', 'R']];
// if the type uses more generics than this then WAT
const Alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

module.exports = function createParamStringForGenerics(numberOfGenerics) {
  let hasParams = typeof numberOfGenerics === 'number' && numberOfGenerics !== 0;
  let paramString = '';
  if (hasParams) {
    let alphabet = Alphabet;
    let params = [];
    if (numberOfGenerics <= TypeParamNamingSchema.length) {
      alphabet = TypeParamNamingSchema[numberOfGenerics - 1];
    }
    for (let i = 0; i < numberOfGenerics; i++) {
      params.push(alphabet[i]);
    }
    paramString = `<${params.join(', ')}>`;
  }
  return paramString;
};
