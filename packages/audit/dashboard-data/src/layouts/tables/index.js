/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Autocomplete from "@mui/material/Autocomplete";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Data
import authorsTableData from "layouts/tables/data/authorsTableData";
import vulnerabilityData from "data.json";
import { useMemo, useState } from "react";

function Tables() {
  const { columns, rows } = authorsTableData();

  // Flatten all scan runs from data.json into package-level rows with date & time
  // Show newest scans first: iterate runs in reverse order
  const runs = Array.isArray(vulnerabilityData) ? [...vulnerabilityData].reverse() : [];

  const allPackages = useMemo(() => {
    const result = [];
    runs.forEach((entry) => {
      const date = entry.date || "";
      const rawTime = entry.time || "";
      const timePart = rawTime.split(".")[0];

      (entry.package || []).forEach((pkg) => {
        result.push({
          date,
          time: timePart,
          ...pkg,
        });
      });
    });
    return result;
  }, [runs]);

  // Unique dates for filter dropdown
  const uniqueDates = useMemo(
    () => Array.from(new Set(allPackages.map((p) => p.date))).filter(Boolean),
    [allPackages]
  );

  const [selectedDate, setSelectedDate] = useState("all");

  const filteredPackages =
    selectedDate === "all" ? allPackages : allPackages.filter((p) => p.date === selectedDate);

  // Transform vulnerability data for the table
  const vulnRows = filteredPackages.map((vuln) => {
    let categoryColor = "info";
    if (vuln.category === "critical") {
      categoryColor = "error";
    } else if (vuln.category === "high") {
      categoryColor = "warning";
    } else if (vuln.category === "moderate") {
      categoryColor = "info";
    }

    return {
      date: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {vuln.date}
        </MDTypography>
      ),
      time: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {vuln.time}
        </MDTypography>
      ),
      packageName: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {vuln.name}
        </MDTypography>
      ),
      oldVersion: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {vuln.old_version}
        </MDTypography>
      ),
      fixedVersion: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {vuln.new_version}
        </MDTypography>
      ),
      category: (
        <MDTypography
          variant="button"
          color="text"
          fontWeight="medium"
          sx={{
            background:
              categoryColor === "error"
                ? "#fde4e4"
                : categoryColor === "warning"
                ? "#fff4e6"
                : "#e3f2fd",
            color:
              categoryColor === "error"
                ? "#c41c3b"
                : categoryColor === "warning"
                ? "#f57c00"
                : "#0d47a1",
            padding: "4px 8px",
            borderRadius: "4px",
            display: "inline-block",
            textTransform: "capitalize",
          }}
        >
          {vuln.category}
        </MDTypography>
      ),
    };
  });

  const vulnColumns = [
    { Header: "Date", accessor: "date", width: "18%", align: "left" },
    { Header: "Time", accessor: "time", width: "18%", align: "left" },
    { Header: "Package Name", accessor: "packageName", width: "26%", align: "left" },
    { Header: "Old Version", accessor: "oldVersion", width: "18%", align: "left" },
    { Header: "Fixed Version", accessor: "fixedVersion", width: "10%", align: "center" },
    { Header: "Category", accessor: "category", width: "10%", align: "center" },
  ];

  return (
    <MDBox pt={6} pb={3}>
      <Grid container spacing={12}>
        <Grid item xs={12}>
          <Card>
            <MDBox
              mx={2}
              mt={-3}
              py={3}
              px={2}
              variant="gradient"
              bgColor="info"
              borderRadius="lg"
              coloredShadow="info"
            >
              <MDTypography variant="h6" color="white">
                Vulnerability Fixes Table
              </MDTypography>
            </MDBox>
            <MDBox pt={3}>
              <MDBox px={2} pb={2} display="flex" justifyContent="flex-end">
                <Autocomplete
                  disableClearable
                  size="small"
                  sx={{ width: "12rem" }}
                  value={selectedDate}
                  options={["all", ...uniqueDates]}
                  onChange={(event, newValue) => setSelectedDate(newValue)}
                  renderInput={(params) => (
                    <MDInput
                      {...params}
                      label="Filter by date"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </MDBox>
              <DataTable
                table={{ columns: vulnColumns, rows: vulnRows }}
                isSorted={false}
                entriesPerPage={{ defaultValue: 5, entries: [5, 10, 25, 50] }}
                showTotalEntries
                noEndBorder
              />
            </MDBox>
          </Card>
        </Grid>
      </Grid>
    </MDBox>
  );
}

export default Tables;
