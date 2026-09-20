import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getZoneConditions, compareRiskScoring, createSubscription } from '../services/subscriptionService';

const TIER_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
};

function SubscribeCard({ onSubscribed }) {
  const { user } = useAuth();
  const [conditions, setConditions] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConditions();
  }, []);

  const loadConditions = async () => {
    setLoading(true);
    setError('');
    try {
      const zoneData = await getZoneConditions(user.zone);
      setConditions(zoneData.conditions);

      const compareResult = await compareRiskScoring({
        rainfallMm: zoneData.conditions.rainfallMm,
        temperatureC: zoneData.conditions.temperatureC,
        aqi: zoneData.conditions.aqi,
        activityScore: 0.85, // placeholder — real activity tracking is a future feature
      });
      setComparison(compareResult);
    } catch (err) {
      setError('Failed to load zone conditions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (method) => {
    setSubscribing(true);
    setError('');
    setSuccess('');

    try {
      await createSubscription(
        {
          rainfallMm: conditions.rainfallMm,
          temperatureC: conditions.temperatureC,
          aqi: conditions.aqi,
          activityScore: 0.85,
        },
        method
      );
      setSuccess(`Subscribed successfully using ${method === 'ml' ? 'ML' : 'rule-based'} scoring!`);
      if (onSubscribed) onSubscribed();
    } catch (err) {
      setError(err.response?.data?.message || 'Subscription failed. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-gray-400 text-center">
        Loading current conditions...
      </div>
    );
  }

  if (error && !conditions) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <p className="text-red-600 mb-3">{error}</p>
        <button onClick={loadConditions} className="text-blue-600 text-sm hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Current Conditions — {user.zone}</h2>
        <button onClick={loadConditions} className="text-xs text-gray-400 hover:text-blue-600">
          ↻ Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Rainfall</p>
          <p className="text-lg font-semibold text-gray-800">{conditions.rainfallMm} mm</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Temperature</p>
          <p className="text-lg font-semibold text-gray-800">{conditions.temperatureC}°C</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">AQI</p>
          <p className="text-lg font-semibold text-gray-800">{conditions.aqi}</p>
        </div>
      </div>

      {comparison && (
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-gray-700">Risk Assessment</p>

          <div className="flex gap-3">
            <div className={`flex-1 rounded-lg border p-3 ${TIER_COLORS[comparison.ruleBasedResult.tier]}`}>
              <p className="text-xs font-medium opacity-75">Rule-Based</p>
              <p className="text-lg font-bold capitalize">{comparison.ruleBasedResult.tier}</p>
              <p className="text-xs">₹{comparison.ruleBasedResult.premium}/week</p>
            </div>

            <div className={`flex-1 rounded-lg border p-3 ${TIER_COLORS[comparison.mlResult.tier]}`}>
              <p className="text-xs font-medium opacity-75">ML Model</p>
              <p className="text-lg font-bold capitalize">{comparison.mlResult.tier}</p>
              <p className="text-xs">{(comparison.mlResult.confidence * 100).toFixed(0)}% confidence</p>
            </div>
          </div>

          {!comparison.agree && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              ⚠ The two models disagree on this assessment — a good example of real-world model uncertainty.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubscribe('rule')}
          disabled={subscribing}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {subscribing ? 'Subscribing...' : 'Subscribe (Rule-Based)'}
        </button>
        <button
          onClick={() => handleSubscribe('ml')}
          disabled={subscribing}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {subscribing ? 'Subscribing...' : 'Subscribe (ML Model)'}
        </button>
      </div>
    </div>
  );
}

export default SubscribeCard;