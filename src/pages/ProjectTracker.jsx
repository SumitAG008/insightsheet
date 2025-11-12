// ProjectTracker.jsx - Project management with Gantt charts and Earned Value Management
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, TrendingUp, DollarSign, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function ProjectTracker() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    name: '',
    startDate: new Date().toISOString().slice(0, 10),
    duration: '',
    budget: '',
    actualCost: '',
    progress: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('project_tasks');
    if (saved) {
      setTasks(JSON.parse(saved));
    }
  }, []);

  const saveTasks = (newTasks) => {
    localStorage.setItem('project_tasks', JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  // Calculate working days (excluding weekends)
  const calculateWorkingDays = (startDate, duration) => {
    const start = new Date(startDate);
    let workingDays = 0;
    let currentDate = new Date(start);

    while (workingDays < duration) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      if (workingDays < duration) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return currentDate.toISOString().slice(0, 10);
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.duration || !newTask.budget) {
      alert('Please fill in task name, duration, and budget');
      return;
    }

    const duration = parseInt(newTask.duration);
    const endDate = calculateWorkingDays(newTask.startDate, duration);

    const task = {
      id: Date.now(),
      name: newTask.name,
      startDate: newTask.startDate,
      endDate: endDate,
      duration: duration,
      budget: parseFloat(newTask.budget),
      actualCost: parseFloat(newTask.actualCost) || 0,
      progress: parseInt(newTask.progress) || 0
    };

    saveTasks([...tasks, task]);

    // Reset form
    setNewTask({
      name: '',
      startDate: new Date().toISOString().slice(0, 10),
      duration: '',
      budget: '',
      actualCost: '',
      progress: 0
    });
  };

  const handleDeleteTask = (id) => {
    if (confirm('Delete this task?')) {
      saveTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleUpdateTask = (id, field, value) => {
    const updated = tasks.map(task => {
      if (task.id === id) {
        const updatedTask = { ...task, [field]: parseFloat(value) || 0 };

        // Recalculate end date if duration changed
        if (field === 'duration') {
          updatedTask.endDate = calculateWorkingDays(task.startDate, parseInt(value));
        }

        return updatedTask;
      }
      return task;
    });

    saveTasks(updated);
  };

  // Calculate Earned Value Management (EVM) metrics
  const calculateEVM = () => {
    const totalBudget = tasks.reduce((sum, t) => sum + t.budget, 0);
    const totalActualCost = tasks.reduce((sum, t) => sum + t.actualCost, 0);
    const totalEarnedValue = tasks.reduce((sum, t) => sum + (t.budget * t.progress / 100), 0);

    const costVariance = totalEarnedValue - totalActualCost; // CV
    const scheduleVariance = totalEarnedValue - totalBudget; // SV (simplified)
    const costPerformanceIndex = totalActualCost > 0 ? totalEarnedValue / totalActualCost : 0; // CPI
    const schedulePerformanceIndex = totalBudget > 0 ? totalEarnedValue / totalBudget : 0; // SPI

    const estimateAtCompletion = costPerformanceIndex > 0 ? totalBudget / costPerformanceIndex : totalBudget; // EAC
    const estimateToComplete = estimateAtCompletion - totalActualCost; // ETC
    const varianceAtCompletion = totalBudget - estimateAtCompletion; // VAC

    return {
      plannedValue: totalBudget,
      earnedValue: totalEarnedValue,
      actualCost: totalActualCost,
      costVariance,
      scheduleVariance,
      costPerformanceIndex,
      schedulePerformanceIndex,
      estimateAtCompletion,
      estimateToComplete,
      varianceAtCompletion
    };
  };

  // Calculate Gantt chart positioning
  const calculateGanttPosition = (task) => {
    if (tasks.length === 0) return { left: 0, width: 0 };

    const allDates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const startOffset = Math.ceil((taskStart - minDate) / (1000 * 60 * 60 * 24));
    const taskDuration = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;

    return {
      left: (startOffset / totalDays) * 100,
      width: (taskDuration / totalDays) * 100
    };
  };

  const evm = calculateEVM();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-200 mb-2">Project Tracker</h1>
          <p className="text-slate-400">
            Task management with Gantt charts and Earned Value Management
          </p>
        </div>

        <Tabs defaultValue="gantt" className="space-y-6">
          <TabsList className="bg-slate-900/80 border border-slate-700/50 p-1">
            <TabsTrigger value="gantt" className="data-[state=active]:bg-slate-700">
              Gantt Chart
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-800">
              Task List
            </TabsTrigger>
            <TabsTrigger value="evm" className="data-[state=active]:bg-emerald-600">
              Earned Value
            </TabsTrigger>
          </TabsList>

          {/* Gantt Chart Tab */}
          <TabsContent value="gantt" className="space-y-6">
            {/* Add New Task */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Task
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4">
                  <Input
                    placeholder="Task name"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Input
                    type="date"
                    value={newTask.startDate}
                    onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Input
                    type="number"
                    placeholder="Duration (days)"
                    value={newTask.duration}
                    onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Input
                    type="number"
                    placeholder="Budget ($)"
                    value={newTask.budget}
                    onChange={(e) => setNewTask({ ...newTask, budget: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-300"
                  />
                  <Button
                    onClick={handleAddTask}
                    className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gantt Chart */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Gantt Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No tasks yet. Add your first task above to see the Gantt chart.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const position = calculateGanttPosition(task);
                      return (
                        <div key={task.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">{task.name}</span>
                            <span className="text-slate-500 text-xs">
                              {task.startDate} → {task.endDate}
                            </span>
                          </div>
                          <div className="relative h-8 bg-slate-800 rounded-lg overflow-hidden">
                            <div
                              className="absolute top-0 h-full bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg flex items-center justify-center"
                              style={{
                                left: `${position.left}%`,
                                width: `${position.width}%`
                              }}
                            >
                              <span className="text-xs text-white font-medium">
                                {task.progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task List Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-200">All Tasks ({tasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No tasks yet. Switch to Gantt Chart tab to add tasks.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <Card key={task.id} className="bg-slate-800/50 border-slate-700/50">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-200">{task.name}</h3>
                              <p className="text-sm text-slate-400">
                                {task.startDate} to {task.endDate} ({task.duration} days)
                              </p>
                            </div>
                            <Button
                              onClick={() => handleDeleteTask(task.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Budget</label>
                              <p className="text-lg font-semibold text-slate-400">
                                ${task.budget.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Actual Cost</label>
                              <Input
                                type="number"
                                value={task.actualCost}
                                onChange={(e) => handleUpdateTask(task.id, 'actualCost', e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-300 h-9"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-2">
                              Progress: {task.progress}%
                            </label>
                            <div className="flex items-center gap-3">
                              <Progress value={task.progress} className="flex-1" />
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={task.progress}
                                onChange={(e) => handleUpdateTask(task.id, 'progress', e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-300 w-20 h-9"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EVM Tab */}
          <TabsContent value="evm" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Core Values */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Core Values
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Planned Value (PV)</span>
                    <span className="text-slate-400 font-semibold">
                      ${evm.plannedValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Earned Value (EV)</span>
                    <span className="text-emerald-400 font-semibold">
                      ${evm.earnedValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Actual Cost (AC)</span>
                    <span className="text-amber-400 font-semibold">
                      ${evm.actualCost.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Indices */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Indices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">CPI (Cost)</span>
                    <span className={`font-semibold ${evm.costPerformanceIndex >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {evm.costPerformanceIndex.toFixed(2)}
                      {evm.costPerformanceIndex >= 1 ? ' ✓' : ' ✗'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">SPI (Schedule)</span>
                    <span className={`font-semibold ${evm.schedulePerformanceIndex >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {evm.schedulePerformanceIndex.toFixed(2)}
                      {evm.schedulePerformanceIndex >= 1 ? ' ✓' : ' ✗'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">CV (Cost Variance)</span>
                    <span className={`font-semibold ${evm.costVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${Math.abs(evm.costVariance).toFixed(2)}
                      {evm.costVariance >= 0 ? ' +' : ' -'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Forecasts */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Forecasts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">EAC (Est. at Completion)</span>
                    <span className="text-slate-400 font-semibold">
                      ${evm.estimateAtCompletion.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">ETC (Est. to Complete)</span>
                    <span className="text-slate-400 font-semibold">
                      ${evm.estimateToComplete.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">VAC (Variance at Completion)</span>
                    <span className={`font-semibold ${evm.varianceAtCompletion >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${Math.abs(evm.varianceAtCompletion).toFixed(2)}
                      {evm.varianceAtCompletion >= 0 ? ' +' : ' -'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Health */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-200">Project Health Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-300 mb-2">Cost Performance</h4>
                    <p className="text-sm text-slate-400">
                      {evm.costPerformanceIndex >= 1
                        ? `✓ Project is under budget. For every $1 spent, you're earning $${evm.costPerformanceIndex.toFixed(2)} of value.`
                        : `⚠ Project is over budget. For every $1 spent, you're earning only $${evm.costPerformanceIndex.toFixed(2)} of value.`}
                    </p>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-300 mb-2">Schedule Performance</h4>
                    <p className="text-sm text-slate-400">
                      {evm.schedulePerformanceIndex >= 1
                        ? `✓ Project is ahead of schedule with SPI of ${evm.schedulePerformanceIndex.toFixed(2)}.`
                        : `⚠ Project is behind schedule with SPI of ${evm.schedulePerformanceIndex.toFixed(2)}.`}
                    </p>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-300 mb-2">Forecast</h4>
                    <p className="text-sm text-slate-400">
                      Based on current performance, project is estimated to cost ${evm.estimateAtCompletion.toFixed(2)} at completion
                      {evm.varianceAtCompletion >= 0
                        ? `, saving $${evm.varianceAtCompletion.toFixed(2)}.`
                        : `, exceeding budget by $${Math.abs(evm.varianceAtCompletion).toFixed(2)}.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
