import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { logout, userType, playerName, hostName } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="bg-gray-900 text-white p-4 shadow-lg">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🏆</span>
          <h1 className="text-2xl font-bold">Super Squares</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {(playerName || hostName) && (
            <span className="text-lg">
              <span className="font-bold text-blue-400">
                {userType === 'player' ? playerName : hostName}
              </span>
            </span>
          )}
          {userType && (
            <span className="text-sm bg-gray-700 px-3 py-1 rounded">
              {userType === 'host' ? 'Host' : 'Player'}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navbar;