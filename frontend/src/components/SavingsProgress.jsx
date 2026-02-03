import { formatCurrency, getCategoryIcon } from '../hooks/useApi';

/**
 * SavingsProgress component for displaying savings goals with progress bars.
 */
export default function SavingsProgress({ goals, loading }) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="h-6 bg-white/10 rounded w-40 mb-4 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-white/10 rounded w-32 mb-2"></div>
              <div className="h-3 bg-white/10 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeGoals = goals?.active_goals || [];
  const completedGoals = goals?.completed_goals || [];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          Metas de Ahorro
        </h3>
        {goals?.total_target > 0 && (
          <div className="text-sm">
            <span className="text-gray-400">Total: </span>
            <span style={{ color: '#11FB1C' }} className="font-medium">
              {goals.total_progress_percent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No hay metas de ahorro configuradas</p>
          <p className="text-sm mt-1">Agrega una meta desde WhatsApp</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active Goals */}
          {activeGoals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} />
          ))}
          
          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Completadas
              </p>
              {completedGoals.slice(0, 2).map((goal) => (
                <GoalItem key={goal.id} goal={goal} completed />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalItem({ goal, completed = false }) {
  const progress = goal.progress_percent || 0;
  const progressStyle = completed
    ? { backgroundColor: '#11FB1C' }
    : progress >= 80
    ? { backgroundColor: '#11FB1C' }
    : progress >= 50
    ? { backgroundColor: '#3B82F6' }
    : progress >= 25
    ? { backgroundColor: '#F59E0B' }
    : { backgroundColor: '#FF0808' };

  return (
    <div className={`${completed ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{goal.icon || '🎯'}</span>
          <span className="text-white font-medium">{goal.name}</span>
          {goal.tag && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
              {goal.tag}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-white">
            {formatCurrency(goal.current_amount || 0)}
            <span className="text-gray-500"> / {formatCurrency(goal.target_amount)}</span>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
            !completed ? 'progress-bar' : ''
          }`}
          style={{ width: `${Math.min(100, progress)}%`, ...progressStyle }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">
          {completed ? '✅ Completada' : `${progress.toFixed(0)}% alcanzado`}
        </span>
        {goal.deadline && !completed && (
          <span className="text-xs text-gray-500">
            Meta: {new Date(goal.deadline).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        )}
        {!completed && goal.remaining > 0 && (
          <span className="text-xs text-amber-400">
            Faltan {formatCurrency(goal.remaining)}
          </span>
        )}
      </div>
    </div>
  );
}
