import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { Platform } from "react-native";
import StorageService from "./storageService";

/**
 * Ensure the local reports directory exists.
 */
async function ensureReportsDirectory() {
  if (Platform.OS === "web") return;
  const reportsDir = `${FileSystem.documentDirectory}reports/`;
  const info = await FileSystem.getInfoAsync(reportsDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
  }
  return reportsDir;
}

/**
 * Generate a professional styled PDF report for a Crop and save it locally.
 */
export async function exportCropReportPDF(crop, lifecycles = [], activities = []) {
  try {
    const cropName = crop?.crop_name || "Crop";
    const variety = crop?.variety || "Standard";
    const fieldName = crop?.field_name || "Plot";
    const sowingDate = crop?.sowing_date || "Not recorded";
    const status = crop?.crop_status || "Active";
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${cropName} - Field Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 30px; line-height: 1.5; }
            .header { border-bottom: 3px solid #2E7D32; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .brand { font-size: 24px; font-weight: 800; color: #2E7D32; }
            .brand-sub { font-size: 12px; color: #6b7280; }
            .report-title { font-size: 20px; font-weight: 700; margin-top: 15px; }
            .date { font-size: 12px; color: #4b5563; }
            .card { background: #f9fbf7; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .card-title { font-size: 14px; font-weight: 700; color: #2e7d32; text-transform: uppercase; margin-bottom: 8px; }
            .grid { display: flex; flex-wrap: wrap; }
            .col { width: 50%; margin-bottom: 8px; }
            .label { font-size: 11px; color: #6b7280; font-weight: 600; }
            .value { font-size: 14px; font-weight: 600; color: #111827; }
            .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
            .footer { border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">ZyGENE</div>
              <div class="brand-sub">Intelligent AgriTech Platform</div>
            </div>
            <div class="date">Generated: ${dateStr}</div>
          </div>

          <div class="report-title">Crop Performance & Lifecycle Report: ${cropName}</div>

          <div class="card">
            <div class="card-title">Crop Summary</div>
            <div class="grid">
              <div class="col"><div class="label">Crop Name</div><div class="value">${cropName}</div></div>
              <div class="col"><div class="label">Variety</div><div class="value">${variety}</div></div>
              <div class="col"><div class="label">Field Location</div><div class="value">${fieldName}</div></div>
              <div class="col"><div class="label">Sowing Date</div><div class="value">${sowingDate}</div></div>
              <div class="col"><div class="label">Current Status</div><div class="badge">${status}</div></div>
              <div class="col"><div class="label">Expected Harvest</div><div class="value">${crop?.expected_harvest_date || "TBD"}</div></div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Field Environment & Soil</div>
            <div class="grid">
              <div class="col"><div class="label">Area</div><div class="value">${crop?.field_area ? `${crop.field_area} ${crop.field_area_unit || "acres"}` : "Standard plot"}</div></div>
              <div class="col"><div class="label">Geographic Location</div><div class="value">${crop?.location_name || "Farm sector"}</div></div>
            </div>
          </div>

          <div class="footer">
            ZyGene Agriculture Management System · Confidential Field Document
          </div>
        </body>
      </html>
    `;

    const sanitizedName = cropName.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    const filename = `CropReport_${sanitizedName}_${timestamp}.pdf`;

    if (Platform.OS === "web") {
      // In web, print dialog is opened directly
      await Print.printAsync({ html });
      return { success: true, filename, uri: null };
    }

    const { uri: tempUri } = await Print.printToFileAsync({ html });
    const reportsDir = await ensureReportsDirectory();
    const destinationUri = `${reportsDir}${filename}`;

    await FileSystem.moveAsync({
      from: tempUri,
      to: destinationUri,
    });

    const fileInfo = await FileSystem.getInfoAsync(destinationUri);

    const record = {
      id: `file_${timestamp}`,
      name: filename,
      path: destinationUri,
      type: "pdf",
      size: fileInfo.size || 0,
      createdAt: new Date().toISOString(),
      label: `${cropName} PDF Report`,
    };

    await StorageService.saveExportedFileRecord(record);

    return {
      success: true,
      uri: destinationUri,
      filename,
      record,
    };
  } catch (error) {
    console.log("[fileService] exportCropReportPDF error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a CSV export for harvest records and store locally.
 */
export async function exportHarvestCSV(records = [], cropName = "Harvest") {
  try {
    const timestamp = Date.now();
    const sanitizedCrop = cropName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Harvest_${sanitizedCrop}_${timestamp}.csv`;

    const headers = "ID,Harvest Date,Yield Amount,Yield Unit,Quality Grade,Notes\n";
    const rows = records.map((r) => {
      const id = r.id || r.local_id || "";
      const date = r.harvest_date || "";
      const yieldAmt = r.yield_amount || "";
      const unit = r.yield_unit || "kg";
      const grade = (r.quality_grade || "").replace(/,/g, " ");
      const notes = (r.notes || "").replace(/[\r\n,]/g, " ");
      return `${id},${date},${yieldAmt},${unit},${grade},${notes}`;
    });

    const csvContent = headers + rows.join("\n");

    if (Platform.OS === "web") {
      // Create a web download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filename, uri: null };
    }

    const reportsDir = await ensureReportsDirectory();
    const fileUri = `${reportsDir}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    const record = {
      id: `file_${timestamp}`,
      name: filename,
      path: fileUri,
      type: "csv",
      size: fileInfo.size || 0,
      createdAt: new Date().toISOString(),
      label: `${cropName} Harvest Data (CSV)`,
    };

    await StorageService.saveExportedFileRecord(record);

    return {
      success: true,
      uri: fileUri,
      filename,
      record,
    };
  } catch (error) {
    console.log("[fileService] exportHarvestCSV error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve all registered exported files.
 */
export async function getExportedFilesList() {
  return await StorageService.getExportedFiles();
}

/**
 * Delete a local exported file.
 */
export async function deleteExportedFile(filePath) {
  try {
    if (Platform.OS !== "web") {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        await FileSystem.deleteAsync(filePath);
      }
    }
    await StorageService.removeExportedFileRecord(filePath);
    return true;
  } catch (err) {
    console.log("[fileService] deleteExportedFile error:", err.message);
    return false;
  }
}
