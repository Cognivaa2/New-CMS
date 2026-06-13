import { Router } from "express";
import { addPhase, getAllPhases, getAllPhasesLookup, editPhase, getPhaseById, deletePhase, reorderPhases, getPhaseDocuments, getPhaseDates } from "../controllers/phase.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middlewares.js";
import { checkPermission } from "../middlewares/checkPermission.middlewares.js";

const router = Router();

router.post("/:projectId/add", verifyToken, checkPermission("project-phases", "create"), addPhase);
router.get("/:projectId/all", verifyToken, checkPermission("project-phases", "view"), getAllPhases);
router.get("/:projectId/allphases", verifyToken, getAllPhasesLookup);
router.get("/:projectId/:phaseId", verifyToken, checkPermission("project-phases", "view"), getPhaseById);
router.put("/:projectId/:phaseId/edit", verifyToken, checkPermission("project-phases", "edit"), editPhase);
router.delete("/:projectId/:phaseId/delete", verifyToken, checkPermission("project-phases", "delete"), deletePhase);
router.put("/:projectId/reorder", verifyToken, checkPermission("project-phases", "edit"), reorderPhases);
router.get("/:projectId/documents/:phaseId", verifyToken, checkPermission("project-phases", "view"), getPhaseDocuments);
router.get("/:projectId/:phaseId/dates", verifyToken, checkPermission("project-phases", "view"), getPhaseDates);

export default router;