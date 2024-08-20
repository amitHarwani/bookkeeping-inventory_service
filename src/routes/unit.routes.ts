import {Router} from "express";
import { addUnitValidator, getAllUnitsValidator } from "../validators/unit.validators";
import { validateInput } from "../validators";
import { addUnit, getAllUnits } from "../controllers/unit.controllers";


const router = Router();

router.get("/get-all-units/:companyId", getAllUnitsValidator(), validateInput, getAllUnits);

router.post("/add-unit", addUnitValidator(), validateInput, addUnit);

export default router;