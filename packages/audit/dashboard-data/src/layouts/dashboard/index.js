// @mui material components
import Grid from "@mui/material/Grid";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import ReportsLineChart from "examples/Charts/LineCharts/ReportsLineChart";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

// Data
import reportsBarChartData from "layouts/dashboard/data/reportsBarChartData";
import reportsLineChartData from "layouts/dashboard/data/reportsLineChartData";
import dashboardData from "data.json";

// Dashboard components
import Projects from "layouts/dashboard/components/Projects";
import OrdersOverview from "layouts/dashboard/components/OrdersOverview";
import Tables from "layouts/tables";

function Dashboard() {
  // Normalize dashboard data from data.json
  const runs = Array.isArray(dashboardData) ? dashboardData : [];
  const fallbackFixedStat = { critical: 0, high: 0, moderate: 0, low: 0 };

  const latestEntry =
    runs.length > 0 ? runs[runs.length - 1] : { fixed_stat: fallbackFixedStat, package: [] };
  const fixedStat = latestEntry.fixed_stat || fallbackFixedStat;

  // Human-readable "last updated" string for charts
  let lastUpdatedAt = "No scans yet";
  if (latestEntry.date) {
    const rawTime = latestEntry.time || "00:00:00";
    const timePart = rawTime.split(".")[0]; // trim microseconds if present

    // Compute days since last fix
    let daysText = "";
    try {
      const iso = `${latestEntry.date}T${timePart}`;
      const fixedDate = new Date(iso);
      if (!Number.isNaN(fixedDate.getTime())) {
        const now = new Date();
        const diffMs = now.getTime() - fixedDate.getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const label = diffDays === 1 ? "day" : "days";
        daysText = ` • ${diffDays} ${label} since last fix`;
      }
    } catch (e) {
      // fall back silently if parsing fails
    }

    lastUpdatedAt = `Last updated at (${latestEntry.date} ${timePart})${daysText}`;
  }

  const totalFixedLatest = Object.values(fixedStat).reduce(
    (sum, val) => sum + (Number.isFinite(val) ? val : 0),
    0
  );
  const totalScans = runs.length;

  const totalFixedAll = runs.reduce((sum, entry) => {
    const fs = entry.fixed_stat || fallbackFixedStat;
    const entryTotal = Object.values(fs).reduce(
      (s, v) => s + (Number.isFinite(v) ? v : 0),
      0
    );
    return sum + entryTotal;
  }, 0);

  // Build bar chart data from latest fixed_stat (per severity)
  const severityOrder = ["critical", "high", "moderate", "low"];
  const severityLabels = ["Critical", "High", "Moderate", "Low"];
  const severityCounts = severityOrder.map((level) => fixedStat[level] || 0);

  const dynamicBarChartData = {
    labels: severityLabels,
    datasets: { label: "Fixed vulnerabilities", data: severityCounts },
  };

  // Build line chart trends over runs
  const lineLabels = runs.map((entry) => entry.date || "");
  const fixesPerRun = runs.map((entry) => {
    const fs = entry.fixed_stat || fallbackFixedStat;
    return Object.values(fs).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  });

  const highCriticalPerRun = runs.map((entry) => {
    const fs = entry.fixed_stat || fallbackFixedStat;
    const high = Number.isFinite(fs.high) ? fs.high : 0;
    const critical = Number.isFinite(fs.critical) ? fs.critical : 0;
    return high + critical;
  });

  const dynamicSales = {
    labels: lineLabels,
    datasets: { label: "Fixed per scan", data: fixesPerRun },
  };

  const dynamicTasks = {
    labels: lineLabels,
    datasets: { label: "High/Critical fixes", data: highCriticalPerRun },
  };

  const useDynamicCharts = runs.length > 0;
  const barChartData = useDynamicCharts ? dynamicBarChartData : reportsBarChartData;
  const sales = useDynamicCharts ? dynamicSales : reportsLineChartData.sales;
  const tasks = useDynamicCharts ? dynamicTasks : reportsLineChartData.tasks;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="dark"
                icon="weekend"
                title="Total Packages (latest scan)"
                count={latestEntry.package ? latestEntry.package.length : 0}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                icon="leaderboard"
                title="Total Scans"
                count={totalScans}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="success"
                icon="store"
                title="Fixed in latest scan"
                count={totalFixedLatest}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="primary"
                icon="person_add"
                title="Total resolved (all scans)"
                count={totalFixedAll}
              />
            </MDBox>
          </Grid>
        </Grid>
        <MDBox mt={4.5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsBarChart
                  color="info"
                  title="Fixed vulnerabilities by severity (latest scan)"
                  date={lastUpdatedAt}
                  chart={barChartData}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsLineChart
                  color="success"
                  title="Vulnerabilities Resolved(Monthly)"
                  description={
                    <>
                      (<strong>+15%</strong>) increase in Monthly Fix.
                    </>
                  }
                  date={lastUpdatedAt}
                  chart={sales}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsLineChart
                  color="dark"
                  title="completed tasks"
                  description="Last Campaign Performance"
                  date={lastUpdatedAt}
                  chart={tasks}
                />
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Tables />
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboard;
