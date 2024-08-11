const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

function hex2str(hex) {
  return ethers.toUtf8String(hex)
}

function str2hex(payload) {
  return ethers.hexlify(ethers.toUtf8Bytes(payload))
}

let participants = []
let ticketPrice = 0.1 // in ETH
let prizePool = 0
let winningNumber = null

async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));

  const metadata = data["metadata"]
  const sender = metadata["msg_sender"]
  const payload = data["payload"]

  let action = hex2str(payload).toLowerCase()

  if (action === "buy ticket") {
    if (!participants.includes(sender)) {
      participants.push(sender)
      prizePool += ticketPrice
      
      const notice_req = await fetch(rollup_server + "/notice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: str2hex(`${sender} bought a ticket`) }),
      });
    } else {
      const report_req = await fetch(rollup_server + "/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: str2hex("You already have a ticket") }),
      });
    }
  } else if (action === "draw") {
    if (participants.length > 0) {
      winningNumber = Math.floor(Math.random() * participants.length)
      const winner = participants[winningNumber]
      
      const notice_req = await fetch(rollup_server + "/notice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: str2hex(`Winner is ${winner}. Prize: ${prizePool} ETH`) }),
      });

      // Reset the lottery
      participants = []
      prizePool = 0
      winningNumber = null
    } else {
      const report_req = await fetch(rollup_server + "/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: str2hex("No participants in the lottery") }),
      });
    }
  } else {
    const report_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: str2hex("Invalid action") }),
    });
  }

  return "accept";
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const payload = data["payload"]
  const route = hex2str(payload)

  let responseObject = {}
  if (route === "participants") {
    responseObject = JSON.stringify({participants})
  } else if (route === "prize") {
    responseObject = JSON.stringify({prizePool})
  } else {
    responseObject = "route not implemented"
  }

  const report_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: str2hex(responseObject) }),
  });

  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();