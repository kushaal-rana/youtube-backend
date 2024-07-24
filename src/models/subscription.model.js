import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is subscribing
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // channel to which subscriber is subscribing
      ref: "User",
    },
  },
  { timestamps: true }
);
//Here we are having a different model because if we add these properties in User model then imagine the scenairo of 1M subscribers and querieing on them =>Expensive operation and lot of cost involved hence A new model is there.
export const subscription = mongoose.model("Subscription", subscriptionSchema);
