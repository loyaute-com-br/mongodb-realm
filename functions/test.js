exports = async function() {
  const response = await context.http.get({ url: "https://api.artic.edu/api/v1/artworks/search?q=cats" })
  // The response body is a BSON.Binary object. Parse it and return.
  return EJSON.parse(response.body.text());
};