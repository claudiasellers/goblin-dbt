"use strict";
// Neo4j access shared by every Cloud Function module.
//
// Secrets are resolved at request time (`.value()` throws at module load), so
// the driver is a lazy singleton reused across warm invocations and never
// closed. Import from here; never construct a second driver, and never import
// from index.ts (it re-exports the modules that import this file).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.neo4jPassword = exports.neo4jUser = exports.neo4jUri = void 0;
exports.getDriver = getDriver;
const params_1 = require("firebase-functions/params");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
exports.neo4jUri = (0, params_1.defineSecret)('NEO4J_URI');
exports.neo4jUser = (0, params_1.defineSecret)('NEO4J_USER');
exports.neo4jPassword = (0, params_1.defineSecret)('NEO4J_PASSWORD');
let driver = null;
function getDriver() {
    if (!driver) {
        driver = neo4j_driver_1.default.driver(exports.neo4jUri.value(), neo4j_driver_1.default.auth.basic(exports.neo4jUser.value(), exports.neo4jPassword.value()));
    }
    return driver;
}
//# sourceMappingURL=db.js.map