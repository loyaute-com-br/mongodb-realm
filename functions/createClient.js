function splitName(name) {
  const firstSpaceIndex = name.indexOf(' ');

  if (firstSpaceIndex !== -1) {
    const firstName = name.substring(0, firstSpaceIndex);
    const surname = name.substring(firstSpaceIndex + 1);
    return { firstName: firstName, surname: surname };
  } else {
    return { firstName: name, surname: '' };
  }
}

exports = async function(request, response){
  try {
    if (request.body === undefined) {
      throw new Error(`Request body was not defined.`);
    }

    if (!context.user) {
      response.setStatusCode(401);
      response.setBody(JSON.stringify({ "error": { "message": `User not authenticated.` }}));
      return;
    }

    // if (!context.user.custom_data.role.includes("ADMIN")) {
    //   response.setStatusCode(401);
    //   response.setBody(JSON.stringify({ "error": { "message": `User not authorized.` }}));
    //   return;
    // }

    const body = JSON.parse(await request.body.text());

    if(!body.cpf || !body.name || !body.phone) {
      throw new Error(`Request body missing data.`);
    }

    const mongodb = context.services.get("mongodb-atlas");

    const { firstName, surname } = splitName(body.name);

    let doc = {
      cpf: body.cpf,
      first_name: firstName,
      surname: surname,
      phone: body.phone
    }

    await mongodb.db("clients").collection("clients").insertOne(doc);

    response.setStatusCode(201);
  } catch (error) {
    response.setStatusCode(400);
    response.setBody(JSON.stringify({ "error": { "message": error.message }}));
  }
};
