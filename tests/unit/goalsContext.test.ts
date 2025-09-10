import { __TESTING__createGoalsManager, Goal } from '@/contexts/GoalsContext';

describe('GoalsContext logic', () => {
  test('adds a goal and retrieves it', async () => {
    const mgr = __TESTING__createGoalsManager([]);
    await mgr.addGoal({ title: 'Test Goal', category: 'custom', current: 0, target: 100 });
    const goals = mgr.getGoals();
    expect(goals.find(g=>g.title==='Test Goal')).toBeTruthy();
  });

  test('completing a goal awards points via gamification callbacks', async () => {
    const gamification = { addPoints: jest.fn(), recordActivity: jest.fn(), checkAchievements: jest.fn() };
    const mgr = __TESTING__createGoalsManager([], gamification);
    await mgr.addGoal({ title: 'Quick Goal', category: 'savings', current: 90, target: 100 });
    let goals = mgr.getGoals();
    const goal = goals[0];
    expect(goal.completedAt).toBeUndefined();
    await mgr.updateGoalProgress(goal.id, 100);
    goals = mgr.getGoals();
    expect(goals[0].completedAt).toBeDefined();
    expect(gamification.addPoints).toHaveBeenCalled();
    expect(gamification.recordActivity).toHaveBeenCalledWith('savings_goal_met', 1);
  });

  test('updateGoalDetails clamps current when target reduced', async () => {
    const mgr = __TESTING__createGoalsManager([]);
    await mgr.addGoal({ title: 'Car', category: 'asset', current: 500, target: 1000 });
    const goal = mgr.getGoals()[0];
    await mgr.updateGoalDetails(goal.id, { target: 400 });
    const updated = mgr.getGoals()[0];
    expect(updated.target).toBe(400);
    expect(updated.current).toBe(400); // clamped
  });
});
