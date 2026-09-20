const { runEvaluationSweep } = require('../services/evaluationJobService');
const { evaluateZone } = require('../services/triggerService');

// @route  POST /api/admin/run-evaluation
// @desc   Manually trigger the automated evaluation sweep
// @access Protected (admin only)
const triggerEvaluation = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const summary = await runEvaluationSweep();
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Evaluation sweep failed', error: error.message });
  }
};

// @route  GET /api/admin/zone-conditions/:zone
// @desc   Check current conditions and triggers for a zone (useful for demos/debugging)
// @access Protected
const getZoneConditions = async (req, res) => {
  try {
    const evaluation = await evaluateZone(req.params.zone);
    res.status(200).json(evaluation);
  } catch (error) {
    res.status(500).json({ message: 'Zone evaluation failed', error: error.message });
  }
};

module.exports = { triggerEvaluation, getZoneConditions };