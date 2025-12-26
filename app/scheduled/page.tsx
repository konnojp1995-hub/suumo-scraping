'use client';

import { useState, useEffect } from 'react';

interface ScrapingJob {
  id: string;
  name: string;
  search_url: string;
  job_type: 'manual' | 'scheduled';
  schedule_time1?: string;
  schedule_time2?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ScheduledJobsPage() {
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    search_url: '',
    schedule_time1: '09:15',
    schedule_time2: '22:15',
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/jobs');
      const data = await response.json();
      if (data.success) {
        // 定期実行ジョブのみをフィルタ
        const scheduledJobs = data.jobs.filter(
          (job: ScrapingJob) => job.job_type === 'scheduled'
        );
        setJobs(scheduledJobs);
      }
    } catch (error) {
      console.error('ジョブ一覧取得エラー:', error);
      alert('ジョブ一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!formData.name.trim() || !formData.search_url.trim()) {
      alert('ジョブ名と検索URLを入力してください');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          search_url: formData.search_url,
          job_type: 'scheduled',
          schedule_time1: formData.schedule_time1,
          schedule_time2: formData.schedule_time2,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('ジョブを作成しました');
        setShowForm(false);
        setFormData({
          name: '',
          search_url: '',
          schedule_time1: '09:15',
          schedule_time2: '22:15',
        });
        loadJobs();
      } else {
        alert(data.error || 'ジョブの作成に失敗しました');
      }
    } catch (error) {
      console.error('ジョブ作成エラー:', error);
      alert('ジョブの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (jobId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        loadJobs();
      } else {
        alert(data.error || 'ジョブの更新に失敗しました');
      }
    } catch (error) {
      console.error('ジョブ更新エラー:', error);
      alert('ジョブの更新に失敗しました');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('このジョブを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('ジョブを削除しました');
        loadJobs();
      } else {
        alert(data.error || 'ジョブの削除に失敗しました');
      }
    } catch (error) {
      console.error('ジョブ削除エラー:', error);
      alert('ジョブの削除に失敗しました');
    }
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:MM形式に変換
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            定期実行管理
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            1日2回（9:15と22:15）の定期実行ジョブを登録・管理します
          </p>
        </header>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">
              定期実行ジョブ一覧
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {showForm ? 'キャンセル' : '新規ジョブ作成'}
            </button>
          </div>

          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ジョブ名
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 新潟市中央区 戸建て検索"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  検索URL
                </label>
                <input
                  type="url"
                  value={formData.search_url}
                  onChange={(e) => setFormData({ ...formData, search_url: e.target.value })}
                  placeholder="https://suumo.jp/jj/chintai/ichiran/..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-gray-200"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    1回目の実行時間
                  </label>
                  <input
                    type="time"
                    value={formData.schedule_time1}
                    onChange={(e) => setFormData({ ...formData, schedule_time1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    2回目の実行時間
                  </label>
                  <input
                    type="time"
                    value={formData.schedule_time2}
                    onChange={(e) => setFormData({ ...formData, schedule_time2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-gray-200"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreateJob}
                  disabled={isCreating}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? '作成中...' : '作成'}
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              定期実行ジョブが登録されていません
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-md p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
                          {job.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            job.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {job.is_active ? '有効' : '無効'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 break-all">
                        {job.search_url}
                      </p>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                        <span>実行時刻: {formatTime(job.schedule_time1)} / {formatTime(job.schedule_time2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleToggleActive(job.id, job.is_active)}
                        className={`px-3 py-1 text-sm rounded ${
                          job.is_active
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                        } transition-colors`}
                      >
                        {job.is_active ? '無効化' : '有効化'}
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


