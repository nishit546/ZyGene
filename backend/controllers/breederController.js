const { pool } = require("../config/db");

const getDashboardOverview = async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(DISTINCT crops.id) AS total_crops,
        COUNT(DISTINCT crops.variety) AS total_varieties,
        COUNT(DISTINCT harvest_records.id) AS total_harvested,
        ROUND(
          AVG(harvest_records.total_yield),
          2
        ) AS average_yield
      FROM crops
      LEFT JOIN lifecycle_records
        ON crops.id = lifecycle_records.crop_id
      LEFT JOIN harvest_records
        ON lifecycle_records.id =
           harvest_records.lifecycle_record_id
    `;

    const result = await pool.query(query);
    const data = result.rows[0] || {};

    return res.status(200).json({
      message: "Dashboard overview fetched successfully",
      overview: {
        total_crops: Number(data.total_crops) || 0,
        total_varieties: Number(data.total_varieties) || 0,
        total_harvested: Number(data.total_harvested) || 0,
        average_yield: Number(data.average_yield) || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch dashboard overview",
    });
  }
};

const getVarietyComparison = async (req, res) => {
  try {
    const query = `
      SELECT
        crops.variety,
        COUNT(DISTINCT crops.id) AS crop_count,
        COUNT(DISTINCT harvest_records.id) AS harvested_count,
        ROUND(
          AVG(harvest_records.total_yield),
          2
        ) AS average_yield,
        ROUND(
          AVG(harvest_records.yield_per_area),
          2
        ) AS average_yield_per_area
      FROM crops
      LEFT JOIN lifecycle_records
        ON crops.id = lifecycle_records.crop_id
      LEFT JOIN harvest_records
        ON lifecycle_records.id =
           harvest_records.lifecycle_record_id
      WHERE crops.variety IS NOT NULL
        AND crops.variety != ''
      GROUP BY crops.variety
      ORDER BY average_yield DESC
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      message: "Variety comparison fetched successfully",
      varieties: result.rows,
    });
  } catch (error) {
    console.error("Variety comparison error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch variety comparison",
    });
  }
};

const getGrowthDuration = async (req, res) => {
  try {
    const query = `
      SELECT
        crops.variety,
        COUNT(DISTINCT crops.id) AS crop_count,
        ROUND(
          AVG(
            datediff(
              harvest_records.harvest_date,
              crops.sowing_date
            )
          ),
          2
        ) AS average_growth_duration,
        MIN(
          datediff(
            harvest_records.harvest_date,
            crops.sowing_date
          )
        ) AS minimum_growth_duration,
        MAX(
          datediff(
            harvest_records.harvest_date,
            crops.sowing_date
          )
        ) AS maximum_growth_duration
      FROM crops
      INNER JOIN lifecycle_records
        ON crops.id = lifecycle_records.crop_id
      INNER JOIN harvest_records
        ON lifecycle_records.id =
           harvest_records.lifecycle_record_id
      WHERE crops.sowing_date IS NOT NULL
        AND crops.variety IS NOT NULL
      GROUP BY crops.variety
      ORDER BY average_growth_duration ASC
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      message: "Growth duration fetched successfully",
      growth_duration: result.rows,
    });
  } catch (error) {
    console.error("Growth duration error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch growth duration",
    });
  }
};

const getDiseaseOccurrence = async (req, res) => {
  try {
    const query = `
      SELECT
        crops.variety,
        COUNT(DISTINCT crops.id) AS crop_count,
        COUNT(
          DISTINCT CASE
            WHEN disease_pest_observations.id IS NOT NULL
            THEN crops.id
          END
        ) AS affected_crops,
        ROUND(
          (
            COUNT(
              DISTINCT CASE
                WHEN disease_pest_observations.id IS NOT NULL
                THEN crops.id
              END
            )::numeric
            /
            NULLIF(COUNT(DISTINCT crops.id), 0)
          ) * 100,
          2
        ) AS disease_occurrence_percentage
      FROM crops
      LEFT JOIN lifecycle_records
        ON crops.id = lifecycle_records.crop_id
      LEFT JOIN disease_pest_observations
        ON lifecycle_records.id =
           disease_pest_observations.lifecycle_record_id
      WHERE crops.variety IS NOT NULL
        AND crops.variety != ''
      GROUP BY crops.variety
      ORDER BY disease_occurrence_percentage ASC
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      message: "Disease occurrence fetched successfully",
      disease_occurrence: result.rows,
    });
  } catch (error) {
    console.error("Disease occurrence error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch disease occurrence",
    });
  }
};

const getLocationPerformance = async (req, res) => {
  try {
    const query = `
      SELECT
        fields.id AS field_id,
        fields.field_name,
        crops.variety,
        COUNT(DISTINCT crops.id) AS crop_count,
        COUNT(DISTINCT harvest_records.id) AS harvested_count,
        ROUND(
          AVG(harvest_records.total_yield),
          2
        ) AS average_yield,
        ROUND(
          AVG(harvest_records.yield_per_area),
          2
        ) AS average_yield_per_area
      FROM fields
      INNER JOIN crops
        ON fields.id = crops.field_id
      LEFT JOIN lifecycle_records
        ON crops.id = lifecycle_records.crop_id
      LEFT JOIN harvest_records
        ON lifecycle_records.id =
           harvest_records.lifecycle_record_id
      WHERE crops.variety IS NOT NULL
        AND crops.variety != ''
      GROUP BY
        fields.id,
        fields.field_name,
        crops.variety
      ORDER BY average_yield DESC
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      message: "Location performance fetched successfully",
      location_performance: result.rows,
    });
  } catch (error) {
    console.error("Location performance error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch location performance",
    });
  }
};

const getStagePerformance = async (req, res) => {
  try {
    const query = `
      SELECT
        crops.variety,
        lifecycle_records.stage,
        growth_measurements.measurement_type,
        ROUND(
          AVG(growth_measurements.measurement_value),
          2
        ) AS average_value,
        growth_measurements.unit,
        COUNT(growth_measurements.id) AS measurement_count
      FROM crops
      INNER JOIN lifecycle_records
        ON crops.id = lifecycle_records.crop_id
      INNER JOIN growth_measurements
        ON lifecycle_records.id =
           growth_measurements.lifecycle_record_id
      WHERE crops.variety IS NOT NULL
        AND crops.variety != ''
      GROUP BY
        crops.variety,
        lifecycle_records.stage,
        growth_measurements.measurement_type,
        growth_measurements.unit
      ORDER BY
        crops.variety,
        lifecycle_records.stage,
        growth_measurements.measurement_type
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      message: "Stage performance fetched successfully",
      stage_performance: result.rows,
    });
  } catch (error) {
    console.error("Stage performance error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch stage performance",
    });
  }
};

const getTopVarieties = async (req, res) => {
  try {
    const query = `
      SELECT
        crops.variety,
        COUNT(DISTINCT crops.id) AS crop_count,
        ROUND(
          AVG(harvest_records.total_yield),
          2
        ) AS average_yield,
        ROUND(
          AVG(harvest_records.yield_per_area),
          2
        ) AS average_yield_per_area,
        ROUND(
          AVG(
            datediff(
              harvest_records.harvest_date,
              crops.sowing_date
            )
          ),
          2
        ) AS average_growth_duration,
        COUNT(
          DISTINCT CASE
            WHEN disease_pest_observations.id IS NOT NULL
            THEN crops.id
          END
        ) AS affected_crops
      FROM crops
      LEFT JOIN lifecycle_records
        ON crops.id = lifecycle_records.crop_id
      LEFT JOIN harvest_records
        ON lifecycle_records.id =
           harvest_records.lifecycle_record_id
      LEFT JOIN disease_pest_observations
        ON lifecycle_records.id =
           disease_pest_observations.lifecycle_record_id
      WHERE crops.variety IS NOT NULL
        AND crops.variety != ''
      GROUP BY crops.variety
      ORDER BY average_yield DESC
    `;

    const result = await pool.query(query);

    const varieties = result.rows.map((item) => {
      const cropCount = Number(item.crop_count) || 0;
      const affectedCrops = Number(item.affected_crops) || 0;
      const averageYield = Number(item.average_yield) || 0;
      const diseaseOccurrence =
        cropCount > 0 ? (affectedCrops / cropCount) * 100 : 0;
      const score = averageYield - diseaseOccurrence;

      return {
        variety: item.variety,
        crop_count: cropCount,
        average_yield: averageYield,
        average_yield_per_area: Number(item.average_yield_per_area) || 0,
        average_growth_duration: Number(item.average_growth_duration) || 0,
        affected_crops: affectedCrops,
        disease_occurrence_percentage: Number(diseaseOccurrence.toFixed(2)),
        performance_score: Number(score.toFixed(2)),
      };
    });

    varieties.sort((a, b) => b.performance_score - a.performance_score);

    return res.status(200).json({
      message: "Top varieties fetched successfully",
      top_varieties: varieties,
    });
  } catch (error) {
    console.error("Top varieties error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch top varieties",
    });
  }
};

module.exports = {
  getDashboardOverview,
  getVarietyComparison,
  getGrowthDuration,
  getDiseaseOccurrence,
  getLocationPerformance,
  getStagePerformance,
  getTopVarieties,
};