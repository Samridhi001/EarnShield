import api from './api';

export const getZoneConditions = async (zone) => {
  const response = await api.get(`/admin/zone-conditions/${zone}`);
  return response.data;
};

export const compareRiskScoring = async (conditions) => {
  const response = await api.post('/subscriptions/compare', conditions);
  return response.data;
};

export const createSubscription = async (conditions, method = 'rule') => {
  const response = await api.post('/subscriptions', { ...conditions, method });
  return response.data;
};

export const getMySubscriptions = async () => {
  const response = await api.get('/subscriptions/my');
  return response.data;
};