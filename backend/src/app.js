import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authenticator } from "../middleware/auth.middleware.js";
import { AuthController } from "../controllers/auth.controller.js";
import { UserController } from "../controllers/user.controller.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { upload } from "../middleware/upload.middleware.js";
import { Reviewer } from "../controllers/reviewer.controller.js";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { Admin } from "../controllers/admin.controller.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "https://emilo-assignment.vercel.app",
        credentials: true,
    },
});

const PORT = process.env.PORT || 5000;
const DB_LINK = process.env.DB_LINK;

if (!DB_LINK) {
    console.log("No db url present");
    process.exit("0");
}

app.use(json());
app.use(cookieParser());

app.use(
    cors({
        origin: "https://emilo-assignment.vercel.app",
        credentials: true,
    })
);

app.post("/signup", AuthController.SIGNUP);
app.post("/login", AuthController.LOGIN);
app.post("/logout", AuthController.LOGOUT);

app.use(authenticator);

app.get("/imageKit", AuthController.IMAGE_KIT);
app.get("/user-info", UserController.getUserInfo);
app.post("/create-post", upload.single("file"), UserController.createPost);
app.get("/feed", UserController.getFeed);
app.post("/post-interaction", UserController.storeInteraction);
app.post("/post-claim-submission", UserController.claimSubmission);
app.post(
    "/claim-deduction-acknowledgement",
    UserController.userClaimDeductionAcknowledgement
);
app.get("/my-claims", UserController.getMyClaims);
app.get("/get-claims-to-review", UserController.getMyClaimsToReview);
app.post("/review-claim/:claimId", Reviewer.reviewClaim);
app.get("/get-confirmed-claims", Admin.getConfirmedClaims);
app.get("/get-settlement", Admin.getSettlement);

// Socket.IO Setup
const claimLocks = new Map(); // claimId -> lockedById

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    io.emit("locked-claims", claimLocks);

    socket.on("refetch", () => {
        io.emit("refetch");
    });

    // Handle claim lock
    socket.on("lock-claim", ({ claimId, userId }) => {
        claimLocks.set(claimId, userId);
        console.log("lock claim", claimLocks);
        io.emit("claim-locked", { claimId, lockedById: userId });
    });

    // Handle claim unlock
    socket.on("unlock-claim", ({ claimId, userId }) => {
        if (claimLocks.get(claimId) === userId) {
            claimLocks.delete(claimId);
            io.emit("claim-unlocked", { claimId });
        }
    });

    socket.on("disconnecting-user", ({ userId }) => {
        const unlockedClaims = [];

        for (const [claimId, lockedById] of claimLocks.entries()) {
            if (lockedById === userId) {
                claimLocks.delete(claimId);
                unlockedClaims.push(claimId);
            }
        }

        // Emit unlock event for each unlocked claim
        unlockedClaims.forEach((claimId) => {
            io.emit("claim-unlocked", { claimId });
        });

        console.log(
            `User ${userId} disconnected and unlocked ${unlockedClaims.length} claims.`
        );
    });

    // Send current locked claims when user joins
    socket.on("get-locked-claims", () => {
        const locked = Array.from(claimLocks.entries()).map(
            ([claimId, lockedById]) => ({
                claimId,
                lockedById,
            })
        );
        socket.emit("locked-claims", locked);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start server
server.listen(PORT, (err) => {
    if (err) {
        console.error("Error", err);
    } else {
        console.log(`Server running on http://localhost:${PORT}`);
        mongoose
            .connect(DB_LINK)
            .then(() => {
                console.log("DB connected and listening on " + PORT);
            })
            .catch((error) => console.error(new Error(error)));
    }
});
