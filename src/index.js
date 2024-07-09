// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/index.js";
// dotenv.config({ path: "./env" });
connectDB();

/*
const app = express();
(async () => {
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
