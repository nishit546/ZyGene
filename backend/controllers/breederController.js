const db = require("../config/db");

const getDashboardOverview = (req, res) => {

  const query = `
    select

      count(distinct crops.id) as total_crops,

      count(distinct crops.variety) as total_varieties,

      count(distinct harvest_records.id) as total_harvested,

      round(
        avg(harvest_records.total_yield),
        2
      ) as average_yield

    from crops

    left join lifecycle_records
      on crops.id = lifecycle_records.crop_id

    left join harvest_records
      on lifecycle_records.id =
         harvest_records.lifecycle_record_id
  `;

  db.query(query, (error, results) => {

    if (error) {

      console.error(
        "Dashboard overview error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch dashboard overview",
      });
    }

    const data = results[0];

    res.status(200).json({
      message:
        "Dashboard overview fetched successfully",

      overview: {
        total_crops:
          data.total_crops || 0,

        total_varieties:
          data.total_varieties || 0,

        total_harvested:
          data.total_harvested || 0,

        average_yield:
          data.average_yield || 0,
      },
    });
  });
};

const getVarietyComparison = (req, res) => {
  const query = `
    select
      crops.variety,

      count(distinct crops.id) as crop_count,

      count(distinct harvest_records.id) as harvested_count,

      round(
        avg(harvest_records.total_yield),
        2
      ) as average_yield,

      round(
        avg(harvest_records.yield_per_area),
        2
      ) as average_yield_per_area

    from crops

    left join lifecycle_records
      on crops.id = lifecycle_records.crop_id

    left join harvest_records
      on lifecycle_records.id =
         harvest_records.lifecycle_record_id

    where crops.variety is not null
      and crops.variety != ''

    group by crops.variety

    order by average_yield DESC
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error(
        "Variety comparison error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch variety comparison",
      });
    }

    res.status(200).json({
      message:
        "Variety comparison fetched successfully",

      varieties: results,
    });
  });
};


const getGrowthDuration = (req, res) => {
  const query = `
    select
      crops.variety,

      count(distinct crops.id) as crop_count,

      round(
        avg(
          datediff(
            harvest_records.harvest_date,
            crops.sowing_date
          )
        ),
        2
      ) as average_growth_duration,

      min(
        datediff(
          harvest_records.harvest_date,
          crops.sowing_date
        )
      ) as minimum_growth_duration,

      max(
        datediff(
          harvest_records.harvest_date,
          crops.sowing_date
        )
      ) as maximum_growth_duration

    from crops

    inner join lifecycle_records
      on crops.id = lifecycle_records.crop_id

    inner join harvest_records
      on lifecycle_records.id =
         harvest_records.lifecycle_record_id

    where crops.sowing_date is not null
      and crops.variety is not null

    group by crops.variety

    order by average_growth_duration asc
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error(
        "Growth duration error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch growth duration",
      });
    }

    res.status(200).json({
      message:
        "Growth duration fetched successfully",

      growth_duration: results,
    });
  });
};


const getDiseaseOccurrence = (req, res) => {
  const query = `
    select
      crops.variety,

      count(distinct crops.id) as crop_count,

      count(
        distinct case
          when disease_pest_observations.id is not null
          then crops.id
        end
      ) as affected_crops,

      round(
        (
          count(
            distinct case
              when disease_pest_observations.id is not null
              then crops.id
            end
          )
          /
          count(distinct crops.id)
        ) * 100,
        2
      ) as disease_occurrence_percentage

    from crops

    left join lifecycle_records
      on crops.id = lifecycle_records.crop_id

    left join disease_pest_observations
      on lifecycle_records.id =
         disease_pest_observations.lifecycle_record_id

    where crops.variety is not null
      and crops.variety != ''

    group by crops.variety

    order by disease_occurrence_percentage asc
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error(
        "Disease occurrence error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch disease occurrence",
      });
    }

    res.status(200).json({
      message:
        "Disease occurrence fetched successfully",

      disease_occurrence: results,
    });
  });
};


const getLocationPerformance = (req, res) => {
  const query = `
    select
      fields.id as field_id,

      fields.field_name,

      crops.variety,

      count(distinct crops.id) as crop_count,

      count(distinct harvest_records.id) as harvested_count,

      round(
        avg(harvest_records.total_yield),
        2
      ) as average_yield,

      round(
        avg(harvest_records.yield_per_area),
        2
      ) as average_yield_per_area

    from fields

    inner join crops
      on fields.id = crops.field_id

    left join lifecycle_records
      on crops.id = lifecycle_records.crop_id

    left join harvest_records
      on lifecycle_records.id =
         harvest_records.lifecycle_record_id

    where crops.variety is not null
      and crops.variety != ''

    group by
      fields.id,
      fields.field_name,
      crops.variety

    order by average_yield desc
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error(
        "Location performance error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch location performance",
      });
    }

    res.status(200).json({
      message:
        "Location performance fetched successfully",

      location_performance: results,
    });
  });
};

const getStagePerformance = (req, res) => {
  const query = `
    select
      crops.variety,

      lifecycle_records.stage,

      growth_measurements.measurement_type,

      round(
        avg(growth_measurements.measurement_value),
        2
      ) as average_value,

      growth_measurements.unit,

      count(growth_measurements.id) as measurement_count

    from crops

    inner join lifecycle_records
      on crops.id = lifecycle_records.crop_id

    inner join growth_measurements
      on lifecycle_records.id =
         growth_measurements.lifecycle_record_id

    where crops.variety is not null
      and crops.variety != ''

    group by
      crops.variety,
      lifecycle_records.stage,
      growth_measurements.measurement_type,
      growth_measurements.unit

    order by
      crops.variety,
      lifecycle_records.stage,
      growth_measurements.measurement_type
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error(
        "Stage performance error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch stage performance",
      });
    }

    res.status(200).json({
      message:
        "Stage performance fetched successfully",

      stage_performance: results,
    });
  });
};

const getTopVarieties = (req, res) => {
  const query = `
    select
      crops.variety,

      count(distinct crops.id) as crop_count,

      round(
        avg(harvest_records.total_yield),
        2
      ) as average_yield,

      round(
        avg(harvest_records.yield_per_area),
        2
      ) as average_yield_per_area,

      round(
        avg(
          datediff(
            harvest_records.harvest_date,
            crops.sowing_date
          )
        ),
        2
      ) as average_growth_duration,

      count(
        distinct case
          when disease_pest_observations.id is not null
          then crops.id
        end
      ) as affected_crops

    from crops

    left join lifecycle_records
      on crops.id = lifecycle_records.crop_id

    left join harvest_records
      on lifecycle_records.id =
         harvest_records.lifecycle_record_id

    left join disease_pest_observations
      on lifecycle_records.id =
         disease_pest_observations.lifecycle_record_id

    where crops.variety is not null
      and crops.variety != ''

    group by crops.variety

    order by average_yield DESC
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error(
        "Top varieties error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch top varieties",
      });
    }

    const varieties = results.map((item) => {

      const cropCount = Number(item.crop_count) || 0;

      const affectedCrops =
        Number(item.affected_crops) || 0;

      const averageYield =
        Number(item.average_yield) || 0;

      const diseaseOccurrence =
        cropCount > 0
          ? (affectedCrops / cropCount) * 100
          : 0;

      const score =
        averageYield -
        diseaseOccurrence;

      return {
        variety: item.variety,

        crop_count: cropCount,

        average_yield: averageYield,

        average_yield_per_area:
          Number(
            item.average_yield_per_area
          ) || 0,

        average_growth_duration:
          Number(
            item.average_growth_duration
          ) || 0,

        affected_crops: affectedCrops,

        disease_occurrence_percentage:
          Number(
            diseaseOccurrence.toFixed(2)
          ),

        performance_score:
          Number(score.toFixed(2)),
      };
    });

    varieties.sort(
      (a, b) =>
        b.performance_score -
        a.performance_score
    );

    res.status(200).json({
      message:
        "Top varieties fetched successfully",

      top_varieties: varieties,
    });
  });
};

module.exports = {
  getDashboardOverview,
  getVarietyComparison
  ,getGrowthDuration,
  getDiseaseOccurrence,
  getLocationPerformance,
  getStagePerformance,
  getTopVarieties
};