import { body, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

export const validateJobCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Job title must be between 3 and 200 characters')
    .escape(),

  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters')
    .escape(),

  body('workType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .withMessage(
      'Work type must be one of: Full-time, Part-time, Contract, Internship'
    ),

  body('status')
    .optional()
    .isIn(['draft', 'active', 'closed'])
    .withMessage('Status must be one of: draft, active, closed'),

  body('summary')
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Summary must be between 50 and 2000 characters'),

  body('requiredSkills')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Required skills must be between 20 and 5000 characters'),

  body('keyResponsibilities')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Key responsibilities must be less than 5000 characters'),

  body('preferredSkills')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Preferred skills must be less than 2000 characters'),

  body('aboutCompany')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('About company must be less than 2000 characters'),

  body('compensation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Compensation must be less than 200 characters'),

  validate
];

export const validateJobUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Job title must be between 3 and 200 characters')
    .escape(),

  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters')
    .escape(),

  body('workType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .withMessage(
      'Work type must be one of: Full-time, Part-time, Contract, Internship'
    ),

  body('status')
    .optional()
    .isIn(['draft', 'active', 'closed'])
    .withMessage('Status must be one of: draft, active, closed'),

  body('summary')
    .optional()
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Summary must be between 50 and 2000 characters'),

  body('requiredSkills')
    .optional()
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Required skills must be between 20 and 5000 characters'),

  body('keyResponsibilities')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Key responsibilities must be less than 5000 characters'),

  body('preferredSkills')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Preferred skills must be less than 2000 characters'),

  body('aboutCompany')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('About company must be less than 2000 characters'),

  body('compensation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Compensation must be less than 200 characters'),

  validate
];

