// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({ path: "./.env" });
connectDB() //this is async method which will always return promise
  .then(() => {
    app.on("error", (error) => {
      console.log("Error: ", error);
      throw error;
    });
    //before app.listen listen for errors
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MONGO DB CONNECTION FAILED !!!", error);
  });

/*
const app = express();
;(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.listen("error", (error)=>{
        console.log("ERR: ", error);
        throw error;
    })
    app.listen(process.env.PORT, ()=>{
        console.log(`APP is listening on ${process.env.PORT}`);
    })
  } catch (error) {
    console.error("Error: " + error);
    throw err;
  }
})();
*/
