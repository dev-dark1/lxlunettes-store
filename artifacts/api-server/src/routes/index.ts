import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import brandsRouter from "./brands";
import ordersRouter from "./orders";
import stockRouter from "./stock";
import reviewsRouter from "./reviews";
import favoritesRouter from "./favorites";
import promotionsRouter from "./promotions";
import adminAuthRouter from "./adminAuth";
import adminDashboardRouter from "./adminDashboard";
import customersRouter from "./customers";
import { settingsRouter } from "./settings";
import { mediaRouter } from "./media";
import { uploadRouter } from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(brandsRouter);
router.use(ordersRouter);
router.use(stockRouter);
router.use(reviewsRouter);
router.use(favoritesRouter);
router.use(promotionsRouter);
router.use(adminAuthRouter);
router.use(adminDashboardRouter);
router.use(customersRouter);
router.use("/admin/settings", settingsRouter);
router.use(mediaRouter);
router.use(uploadRouter);

export default router;
