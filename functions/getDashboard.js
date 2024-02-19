exports = async function() {
  const collection = context.services.get("mongodb-atlas").db("clients").collection("transactions");

  const pipeline = [
    {
      $group: {
        _id: null,
        transactions: { $push: "$$ROOT" },
        totalRevenue: { $sum: "$value" }
      }
    }
  ];

  const result = await collection.aggregate(pipeline).toArray();

  return result[0];
};
