exports = async function() {
  const response = await context.http.get({ url: "https://www.example.com/users" })
  // The response body is a BSON.Binary object. Parse it and return.
  return EJSON.parse(response.body.text());
};