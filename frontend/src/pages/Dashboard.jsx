import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">EarnShield 🚀</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-red-600 transition"
          >
            Log out
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Welcome, {user?.name} 👋
          </h2>
          <p className="text-gray-600">Zone: {user?.zone}</p>
          <p className="text-gray-600">Wallet balance: ₹{user?.walletBalance ?? 0}</p>
        </div>

        <p className="text-gray-400 text-sm mt-6">
          Full dashboard coming in the next few days — subscriptions, alerts, claims, and payout history.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;