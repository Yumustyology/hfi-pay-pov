import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    displayName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    homeRelay: {
      type: String,
      default: "relay-hfi-01",
    },

    preferredChain: {
      type: String,
      default: "Base Sepolia",
    },

    isVerified: {
      type: Boolean,
      default: true,
    },

    avatar: String,
  },
  {
    timestamps: true,
  }
);

export default models.User || model("User", UserSchema);
