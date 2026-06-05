// Re-export barrel — all admin logic now lives in focused domain controllers.
// adminRoutes.js imports from this file and needs no changes.

export * from "./adminStatsController.js";
export * from "./adminUserController.js";
export * from "./adminSellerController.js";
export * from "./adminOrderController.js";
export * from "./adminPayoutController.js";
export * from "./adminContentController.js";
export * from "./adminModerationController.js";
export * from "./adminBroadcastController.js";
export * from "./adminConfigController.js";
export * from "./adminVerificationController.js";
