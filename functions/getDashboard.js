exports = async function() {
  const collection = context.services.get("mongodb-atlas").db("clients").collection("transactions");

  const pipeline = [
    {
      $group: {
        _id: null,
        transactions: { $push: "$$ROOT" },
        totalRevenue: { $sum: "$value" },
        count: { $sum: 1 },
        countWithCashback: { $sum: { $cond: [{ $eq: ["$used_cashback", true] }, 1, 0] } }
      }
    }
  ];

  const result = await collection.aggregate(pipeline).toArray();

  return result[0];
};
