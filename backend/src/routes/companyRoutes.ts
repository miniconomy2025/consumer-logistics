import { Router } from 'express';
import { CompanyController } from '../controllers/companyController';

const router = Router();
const companyController = new CompanyController();

// --- Basic CRUD Routes ---
router.post('/', companyController.createCompany);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);



export default router;
