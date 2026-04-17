import { useEffect, useState } from "react";
import { checkDatabaseHealth, getDatabaseStats, seedTestData, resetDatabase } from "@/utils/supabase/init";
import { projectId, supabaseUrl } from "@/utils/supabase/info";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";

interface HealthStatus {
  success: boolean;
  message: string;
  tables?: string[];
  error?: string;
}

interface Stats {
  success: boolean;
  stats?: Record<string, number>;
  error?: string;
}

export default function DatabaseSetup() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const result = await checkDatabaseHealth();
      setHealthStatus(result);
      
      if (result.success) {
        toast.success("Database is healthy!");
      } else {
        toast.error("Some database tables are missing");
      }
    } catch (error) {
      toast.error(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const result = await getDatabaseStats();
      setStats(result);
      
      if (result.success) {
        toast.success("Stats fetched successfully!");
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    if (confirm("Are you sure you want to seed test data? Continue?")) {
      setLoading(true);
      try {
        const result = await seedTestData();
        
        if (result.success) {
          toast.success(result.message);
          await checkHealth();
          await fetchStats();
        } else {
          toast.error(`Error: ${result.error}`);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const reset = async () => {
    if (confirm("⚠️ WARNING: This will delete ALL data! Are you absolutely sure? Type 'reset' to confirm.\n\nThis action CANNOT be undone.")) {
      setLoading(true);
      try {
        const result = await resetDatabase();
        
        if (result.success) {
          toast.success(result.message);
          await checkHealth();
          await fetchStats();
        } else {
          toast.error(`Error: ${result.error}`);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    checkHealth();
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <Toaster />
      
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Database Setup & Monitoring</h1>
          <p className="text-lg text-slate-600">Sistem Administrasi Siswa - Supabase Integration</p>
        </div>

        {/* Database Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle>Database Configuration</CardTitle>
            <CardDescription>Current Supabase connection details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-600">Project ID</p>
                <p className="text-sm text-slate-900 break-all">{projectId || "Belum diset"}</p>
              </div>
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-600">URL</p>
                <p className="text-sm text-slate-900 break-all">{supabaseUrl || "Belum diset"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Check */}
        <Card>
          <CardHeader>
            <CardTitle>Database Health Check</CardTitle>
            <CardDescription>Verify all tables are created and accessible</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthStatus && (
              <Alert variant={healthStatus.success ? "default" : "destructive"}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {healthStatus.message}
                </AlertDescription>
              </Alert>
            )}

            {healthStatus?.tables && (
              <div className="bg-slate-100 p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {healthStatus.tables.map((table, idx) => (
                  <p key={idx} className="text-sm font-mono text-slate-700">
                    {table}
                  </p>
                ))}
              </div>
            )}

            <Button 
              onClick={checkHealth} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check Database Health
            </Button>
          </CardContent>
        </Card>

        {/* Database Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Database Statistics</CardTitle>
            <CardDescription>Number of records in each table</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.stats && (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(stats.stats).map(([table, count]) => (
                  <div key={table} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-slate-600 capitalize">
                      {table.replace(/_/g, " ")}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={fetchStats} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh Statistics
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Seed test data or reset database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                These actions are useful for development and testing. Use with caution on production data.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={seedData} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Seed Test Data
              </Button>

              <Button 
                onClick={reset} 
                disabled={loading}
                variant="destructive"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Database
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Useful Links</CardTitle>
            <CardDescription>Access tools and documentation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href="https://app.supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              → Supabase Dashboard
            </a>
            <a 
              href="https://supabase.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              → Supabase Documentation
            </a>
            <a 
              href="/SETUP_DATABASE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              → Database Setup Guide
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
