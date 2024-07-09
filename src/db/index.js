import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_Name}`
    );
    console.log(
      `MongoDB connected !! DB HOST: ${connectionInstance.connection.host}, ${process.env.MONGODB_URI}`
    );
  } catch (error) {
    console.log("MONGODB connection Failed ", error);
    process.exit(1);
  }
};

export default connectDB;
