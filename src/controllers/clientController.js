import Client from '../models/Client.js';

export const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).send(err);
  }
};

export const createClient = async (req, res) => {
  try {
    const client = new Client({
      id: req.body.id,
      name: req.body.name,
      number: req.body.number,
      address: req.body.address,
      accountOwner: req.body.accountOwner
    });
    await client.save();
    res.json({ message: "Client added!" });
  } catch (err) {
    res.status(500).send(err);
  }
};

export const getClientById = async (req, res) => {
  try {
    const docs = await Client.find({ id: req.params.id });
    res.json(docs);
  } catch (err) {
    res.status(500).send(err);
  }
};

export const updateClient = async (req, res) => {
console.log("Updating client", req.body);
console.log("Client ID", req.params.id);
  try {
    const result = await Client.updateOne(
      { id: req.params.id },
      req.body
    );
    console.log("Result", result);
    res.json(result);
  } catch (err) {
    res.status(500).send(err);
  }
};

export const searchClients = async (req, res) => {
  try {
    const docs = await Client.find({
      $or: [
        { name: { $regex: ".*" + req.query.q + ".*", $options: "i" } },
        { accountOwner: { $regex: ".*" + req.query.q + ".*", $options: "i" } }
      ]
    });
    res.json(docs);
  } catch (err) {
    res.status(500).send(err);
  }
}; 