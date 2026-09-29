import { Router } from "express";

import { attachAuth } from "../http/context";
import { adminRouter } from "./admin";
import { authRouter, contentRouter } from "./content";
import { communityRouter } from "./community";
import { learnerRouter } from "./learner";
import { metaRouter } from "./meta";
import { practiceRouter } from "./practice";


export const apiRouter = Router();

apiRouter.use(attachAuth);
apiRouter.use(metaRouter);
apiRouter.use(contentRouter);
apiRouter.use(practiceRouter);
apiRouter.use(learnerRouter);
apiRouter.use(communityRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use(authRouter);
