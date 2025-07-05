import { Router } from 'express';
import { CompanyController } from '../controllers/companycontroller';

const router = Router();
const companyController = new CompanyController();

router.post('/', companyController.registerCompany);
router.get('/', companyController.getAllCompanies);

export default router;