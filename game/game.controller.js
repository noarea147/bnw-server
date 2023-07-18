require("dotenv").config();
const GameModel = require("./game.model");
const UserModel = require("../user/user.model");
const axios = require("axios");

exports.CreateGame = async (req, res) => {
  try {
    const gameRunning = await GameModel.findOne({ closed: "false" });
    if (!gameRunning) {
      const game = new GameModel({
        status: "openForParticipation",
        closed: false,
        activeRound: -1,
      });
      await game.save();
      if (!game) {
        return res.json({ message: err, status: "fail" });
      }
      users = await UserModel.find({});
      if (users.length === 0) {
        return res.json({
          message: "there are no users to participate in the game",
          status: "fail",
        });
      }
      // users.forEach(async (user) => {
      //   // get game state for player
      //   var gameState = await getGameStateForUser(game, user._id);
      //   await sendNotificationToUser(user._id, gameState);
      // });
      return res.json({
        game: game,
        status: "success",
      });
    } else {
      res.status(500).send({
        message: "can't create game when another game is active",
        status: "fail",
      });
    }
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.StartGame = async (req, res) => {
  try {
    const game = await GameModel.findOneAndUpdate(
      { closed: "false" },
      { status: "running", activeRound: 1 },
      { new: true }
    );
    if (game) {
      res.json({
        message: game,
        status: "success",
      });
    } else {
      res.json({
        message: "the are no games to start, please create a game first",
        status: "fail",
      });
    }
    // await notifyPlayersByNewState()
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.CloseGame = async (req, res) => {
  try {
    const game = await GameModel.findOneAndUpdate(
      { closed: false },
      { closed: true, status: "ended" },
      { new: true }
    );

    if (!game) {
      return res.json({
        message: "Something went wrong",
        status: "fail",
      });
    }
    // Uncomment and implement the necessary code for handling notifications
    // users.forEach(async (user) => {
    //   const gameState = await getGameStateForUser(game, user._id);
    //   await sendNotificationToUser(user._id, gameState);
    // });

    return res.json({
      message: game,
      status: "success",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Could not process the request",
      status: "fail",
    });
  }
};

exports.ParticipateInGame = async (req, res) => {
  try {
    const { userId } = req.body;
    const game = await GameModel.findOne({ closed: "false" });
    const openForParticipationStatus = "openForParticipation";
    if (!game) {
      return res.json({
        message: "there are currently no games running",
        status: "fail",
      });
    } else if (game.status !== openForParticipationStatus) {
      return res.json({
        message: "the game is no longer open for participation",
        status: "fail",
      });
    } else {
      const gameContainingUser = await GameModel.find({
        closed: "false",
        currentRound: { $elemMatch: { player: userId } },
      });
      if (gameContainingUser.length === 0) {
        await GameModel.findOneAndUpdate(
          { closed: "false" },
          {
            $addToSet: {
              currentRound: { player: userId, answer: "no answer" },
            },
          }
        );
        return res.json({
          message: "you have successfully joined the on going game",
          status: "success",
        });
      } else {
        return res.json({
          message: "you have already joined the on going game",
          status: "success",
        });
      }
    }
  } catch (err) {
    res.status(500).send({ message: err, status: "fail" });
  }
};

exports.GuestAnswer = async (req, res) => {
  try {
    const { userId, answer } = req.body;
    const game = await GameModel.findOne({ closed: false });

    if (!game) {
      return res.status(404).json({
        message: "There are currently no games running.",
        status: "fail",
      });
    }

    if (game.status === "answers locked") {
      return res.status(400).json({
        message: "Answers are locked now.",
        status: "fail",
      });
    }

    if (game.status !== "running") {
      return res.status(400).json({
        message: "The game is not open for answers at the moment.",
        status: "fail",
      });
    }

    const gameContainingUser = await GameModel.find({
      closed: false,
      currentRound: { $elemMatch: { player: userId } },
    });

    if (gameContainingUser.length === 0) {
      return res.status(400).json({
        message: "User is not part of this round.",
        status: "fail",
      });
    }

    await GameModel.findOneAndUpdate(
      {
        closed: false,
        currentRound: { $elemMatch: { player: userId } },
      },
      { $set: { "currentRound.$[element].answer": answer } },
      { arrayFilters: [{ "element.player": userId }], upsert: true }
    );

    return res.json({
      message: "You have successfully submitted an answer.",
      status: "success",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Could not process the request.",
      status: "fail",
    });
  }
};

exports.HostAnswer = async (req, res) => {
  try {
    const game = await GameModel.findOne({ closed: "false" });
    const running = "running";
    const locked = "answers locked";
    if (!game) {
      res.json({
        message: "there are currently no games running",
        status: "fail",
      });
    } else if (game.status !== running && game.status !== locked) {
      res.json({
        message: "the game is not open for answers at the moment",
        status: "fail",
      });
    } else {
      game.status = "running";
      const newGame = await GameModel.findOneAndUpdate(
        { closed: "false" },
        { $pull: { currentRound: { answer: { $nin: [req.body.answer] } } } },
        { new: true }
      );
      await GameModel.findOneAndUpdate(
        {
          closed: "false",
        },
        { $set: { "currentRound.$[element].answer": "no answer" } },
        { arrayFilters: [{ "element.answer": req.body.answer }], upsert: true }
      );
      const roundNumer = game.activeRound + 1;
      await GameModel.findOneAndUpdate(
        {
          closed: "false",
        },
        { activeRound: roundNumer }
      );

      if (newGame.currentRound.length === 0) {
        // all players have been eliminated
        // game over
        game.closed = false;
        game.status = "giving results";
        await game.save();
        // await notifyPlayersByNewState(game)
        return res.json({
          message: "game is over, all players have been eliminated",
          status: "success",
        });
      }
      //number of rounds
      if (game.activeRound >= 10) {
        // get the currentRound table and populate the player field
        const playersLeft = await GameModel.findOne({ closed: "false" })
          .populate({
            path: "currentRound.player",
            model: "User",
          })
          .lean();
        const winners = [];
        playersLeft.currentRound.forEach((element) => {
          console.log("palyer id ", element.player._id.toString());
          winners.push(element.player);
        });
        game.winners = winners;
        game.closed = "true";
        game.status = "ended";
        await game.save();
        // await notifyPlayersByNewState(game)
        return res.json({ message: "We have some winners", status: "success" });
      }
      // await notifyPlayersByNewState(game)
      game.status = "running";
      await game.save();
      return res.json({
        message: "you have successfully eliminated players with wrong answers",
        status: "success",
      });
    }
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.checkWinnersList = async (req, res) => {
  const { userId, gameId } = req.body;
  try {
    const game = await GameModel.findById(gameId).populate("winners");
    if (!game) {
      return res.status(404).send({
        message: "Game not found",
        status: "fail",
      });
    } else {
      let isWinner = false;
      game.winners.forEach((winner) => {
        console.log(winner);
        if (userId === winner._id.toString()) {
          isWinner = true;
        }
      });
      return res.status(200).send({
        isWinner: isWinner,
      });
    }
  } catch (err) {
    return res.status(500).send({
      message: "Could not process the request",
      status: "fail",
    });
  }
};

exports.GameStats = async (req, res) => {
  try {
    const game = await GameModel.findOne({ closed: "false" });
    if (!game) {
      res.json({
        message: "there are currently no games running",
        status: "fail",
      });
    } else if (game.status === "running") {
      // number of players in array currentRound in game
      const numberOfPlayers = game.currentRound.length;
      // number of players with answers in array currentRound in game
      const numberOfPlayersWithNoAnswers =
        numberOfPlayers -
        game.currentRound.filter((player) => player.answer !== "no answer")
          .length;
      // number of players who answered yes
      const numberOfPlayersWithAnswerYes = game.currentRound.filter(
        (player) => player.answer === "yes"
      ).length;
      // number of players who answered no
      const numberOfPlayersWithAnswerNo = game.currentRound.filter(
        (player) => player.answer === "no"
      ).length;
      const stats = {
        status: "running",
        numberOfPlayers,
        numberOfPlayersWithNoAnswers,
        numberOfPlayersWithAnswerYes,
        numberOfPlayersWithAnswerNo,
      };
      res.json({
        message: stats,
        status: "success",
      });
    }
    // check if game is giving results
    else if (game.status === "giving results") {
      // if winners is not null then return the winners
      if (game.winners) {
        const stats = {
          status: "game over",
          winners: game.winners,
        };
        res.json({
          message: stats,
          status: "success",
        });
      }
    } else if (game.status === "openForParticipation") {
      // number of players in array currentRound in game
      const numberOfPlayers = game.currentRound.length;
      const stats = {
        status: "game is open for participation",
        numberOfPlayers,
      };
      res.json({
        message: stats,
        status: "success",
      });
    }
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.LockAnswers = async (req, res) => {
  try {
    const game = await GameModel.findOne({ closed: "false" });
    if (!game) {
      res.json({
        message: "there are currently no games running",
        status: "fail",
      });
    } else if (game.status === "running") {
      // update game status to answers locked
      game.status = "answers locked";
      await game.save();
      // await notifyPlayersByNewState(game)
      return res.json({ message: "answers are locked", status: "success" });
    }
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.GetGame = async (req, res) => {
  try {
    const game = await GameModel.findOne({ closed: "false" });
    const userId = req.body.id;
    if (!game) {
      res.json({
        message: "there are currently no games running",
        status: "fail",
      });
    } else {
      const gameState = await getGameStateForUser(game, userId);
      res.json({ message: gameState, status: "success" });
    }
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

// SendNotification
exports.SendNotification = async (req, res) => {
  try {
    const users = await UserModel.find({});
    const fcmTokens = [];
    users.forEach((user) => {
      if (user.firebase_token) fcmTokens.push(user.firebase_token);
    });
    const message = {
      notification: {
        body: req.body.body,
        title: req.body.title,
      },
      registration_ids: fcmTokens,
    };

    const url = "https://fcm.googleapis.com/fcm/send";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
    };
    await axios
      .post(url, message, { headers })
      .then((response) => {
        return res.json({ message: "notification sent", status: "success" });
      })
      .catch((error) => {
        console.log(error);
        return res.json({ message: "notification not sent", status: "fail" });
      });
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

async function notifyPlayersByNewState(game = null) {
  const beforeGame = game
    ? game
    : await GameModel.findOne({
        closed: "false",
      }).populate({
        path: "currentRound.player",
        model: "User",
      });
  const afterGame = await GameModel.findOne({
    closed: "false",
  }).populate({
    path: "currentRound.player",
    model: "User",
  });
  beforeGame.currentRound.forEach(async (element) => {
    // get game state for player
    var gameState = await getGameStateForUser(afterGame, element.player._id);
    await sendNotificationToUser(element.player._id, gameState);
  });
}

async function notifyAllUsersByGameOpenForParticipation() {
  const users = await UserMpdel.find({});
  users.forEach(async (user) => {
    // get game state for player
    var gameState = await getGameStateForUser(game, user._id);
    await sendNotificationToUser(user._id, gameState);
  });
}
async function sendNotificationToUser(playerID, gameState) {
  const user = await UserModel.findOne({ _id: playerID });
  const fcmTokens = [user.firebase_token];
  var title = "Noir ou Blanc";
  const message = {
    notification: {
      title: title,
    },
    data: gameState,
    registration_ids: fcmTokens,
  };

  const url = "https://fcm.googleapis.com/fcm/send";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
  };

  const response = await axios.post(url, message, { headers });
  return response;
}

async function sendNotificationToUser(userID, Message) {
  const user = await UserModel.findOne({ _id: userID });
  const fcmTokens = [user.firebase_token];
  var title = "Noir ou Blanc";
  const message = {
    notification: {
      title: title,
      body: Message,
    },
    registration_ids: fcmTokens,
  };

  const url = "https://fcm.googleapis.com/fcm/send";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
  };

  const response = await axios.post(url, message, { headers });
  return response;
}

// getGameStateForUser
async function getGameStateForUser(game, userId) {
  const gamePopulated = await GameModel.findById(game._id).populate(
    "currentRound.player"
  );
  let userInCurrentRound = false;
  gamePopulated.currentRound.forEach((player) => {
    if (player.player._id.toString() === userId.toString()) {
      userInCurrentRound = true;
    }
  });
  const gameState = {
    gameId:game._id,
    userInCurrentRound: userInCurrentRound,
    gameStatus: game.status,
    activeRound: game.activeRound,
    winners: game.winners,
  };
  return gameState;
}
