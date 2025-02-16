import { Client as RestClient } from "node-rest-client";

const client = new RestClient();

export const sendSMS = async (number, message) => {
  const args = {
    headers: { "Content-Type": "application/json" },
  };
  
  const url = `https://api.textlocal.in/send/?apikey=MzgzNDQ0NzMzMjMxNjE0NDRlNTY0NzZkNDY0YTVhNTc=&numbers=${number}&message=${encodeURIComponent(message)}&sender=BPPLWB`;
  
  return new Promise((resolve, reject) => {
    client.post(url, args, function (data, response) {
      console.log(data);
      resolve(data);
    });
  });
}; 