import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";

export async function fetchFarmerNotifications() {
  try {
    const cropsRes = await API.get("/crops");
    const crops = cropsRes.data?.crops || [];
    
    // Limit to recent active crops to avoid overwhelming the server
    const activeCrops = crops.filter(c => (c.crop_status || "").toLowerCase() !== 'harvested')
                             .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
                             .slice(0, 5);

    let notifications = [];
    
    // Incomplete info
    crops.forEach(c => {
      if (!c.variety) {
        notifications.push({
          id: `att-var-${c.id}`,
          type: "ATTENTION",
          title: "Incomplete information",
          description: `Crop variety missing for ${c.crop_name}`,
          date: c.created_at,
          cropId: c.id,
          route: `/farmer/crop-details/${c.id}`,
          read: false
        });
      }
    });

    const lifecyclePromises = activeCrops.map(c => 
      API.get(`/lifecycle/${c.id}`).then(res => ({ crop: c, data: res.data })).catch(() => null)
    );
    const lifecycleResults = await Promise.all(lifecyclePromises);

    const recordPromises = [];

    lifecycleResults.forEach(res => {
      if (!res || !res.data?.records?.length) return;
      const c = res.crop;
      const records = res.data.records;
      
      const latestLr = records[0]; 
      
      notifications.push({
        id: `act-lc-${latestLr.id}`,
        type: "ACTIVITY",
        title: "Crop lifecycle updated",
        description: `${c.crop_name} is now in ${latestLr.stage_name.replace("_", " ")}`,
        date: latestLr.start_date || latestLr.created_at,
        cropId: c.id,
        route: `/farmer/crop-details/${c.id}/lifecycle`,
        read: false
      });

      recordPromises.push(
        API.get(`/disease-pest/${latestLr.id}`).then(r => ({ type: 'disease', crop: c, lrId: latestLr.id, data: r.data })).catch(()=>null),
        API.get(`/irrigation/${latestLr.id}`).then(r => ({ type: 'irrigation', crop: c, lrId: latestLr.id, data: r.data })).catch(()=>null),
        API.get(`/measurements/${latestLr.id}`).then(r => ({ type: 'measurement', crop: c, lrId: latestLr.id, data: r.data })).catch(()=>null),
        API.get(`/treatments/${latestLr.id}`).then(r => ({ type: 'treatment', crop: c, lrId: latestLr.id, data: r.data })).catch(()=>null),
        API.get(`/harvest/${latestLr.id}`).then(r => ({ type: 'harvest', crop: c, lrId: latestLr.id, data: r.data })).catch(()=>null)
      );
    });

    const recordResults = await Promise.all(recordPromises);

    recordResults.forEach(res => {
      if (!res) return;
      const c = res.crop;
      const lrId = res.lrId;
      
      if (res.type === 'disease' && res.data?.observations?.length > 0) {
        res.data.observations.forEach(obs => {
          notifications.push({
            id: `att-dis-${obs.id}`,
            type: "ATTENTION",
            title: "Disease/Pest recorded",
            description: `${obs.name} observed in ${c.crop_name}`,
            date: obs.observation_date || obs.created_at,
            cropId: c.id,
            route: `/farmer/crop-details/${c.id}/disease-pest/${lrId}`,
            read: false
          });
        });
      }
      
      if (res.type === 'irrigation' && res.data?.irrigation?.length > 0) {
        const arr = res.data.irrigation;
        const irr = arr[arr.length - 1]; // or [0], wait irrigation API might return asc or desc. Usually [0] if ordered by date.
        // Actually the backend might return ASC. Let's sort to be safe.
        arr.sort((a,b) => new Date(b.irrigation_date || b.created_at) - new Date(a.irrigation_date || a.created_at));
        const item = arr[0];
        notifications.push({
          id: `act-irr-${item.id}`,
          type: "ACTIVITY",
          title: "Irrigation recorded",
          description: `${item.water_quantity} ${item.unit} applied to ${c.crop_name}`,
          date: item.irrigation_date || item.created_at,
          cropId: c.id,
          route: `/farmer/crop-details/${c.id}/irrigation/${lrId}`,
          read: false
        });
      }
      
      if (res.type === 'treatment' && res.data?.treatments?.length > 0) {
        const arr = res.data.treatments;
        arr.sort((a,b) => new Date(b.application_date || b.created_at) - new Date(a.application_date || a.created_at));
        const item = arr[0];
        notifications.push({
          id: `act-trt-${item.id}`,
          type: "ACTIVITY",
          title: "Treatment recorded",
          description: `${item.treatment_name} applied to ${c.crop_name}`,
          date: item.application_date || item.created_at,
          cropId: c.id,
          route: `/farmer/crop-details/${c.id}/treatments/${lrId}`,
          read: false
        });
      }

      if (res.type === 'harvest' && res.data?.harvest?.length > 0) {
        const arr = res.data.harvest;
        arr.sort((a,b) => new Date(b.harvest_date || b.created_at) - new Date(a.harvest_date || a.created_at));
        const item = arr[0];
        notifications.push({
          id: `act-har-${item.id}`,
          type: "ACTIVITY",
          title: "Harvest recorded",
          description: `Yield: ${item.total_yield} ${item.yield_unit} for ${c.crop_name}`,
          date: item.harvest_date || item.created_at,
          cropId: c.id,
          route: `/farmer/crop-details/${c.id}/harvest/${lrId}`,
          read: false
        });
      }

      if (res.type === 'measurement' && res.data?.measurements?.length > 0) {
        const arr = res.data.measurements;
        arr.sort((a,b) => new Date(b.measurement_date || b.created_at) - new Date(a.measurement_date || a.created_at));
        const item = arr[0];
        notifications.push({
          id: `act-mes-${item.id}`,
          type: "ACTIVITY",
          title: "Measurement added",
          description: `${item.measurement_type}: ${item.measurement_value} ${item.unit || ''} for ${c.crop_name}`,
          date: item.measurement_date || item.created_at,
          cropId: c.id,
          route: `/farmer/crop-details/${c.id}/measurements/${lrId}`,
          read: false
        });
      }
    });

    // Deduplicate by ID
    const uniqueMap = new Map();
    notifications.forEach(n => {
      if (!uniqueMap.has(n.id)) {
        uniqueMap.set(n.id, n);
      }
    });
    notifications = Array.from(uniqueMap.values());

    // Sort by date DESC
    notifications.sort((a,b) => new Date(b.date) - new Date(a.date));

    const storedReadStr = await AsyncStorage.getItem("read_notifications");
    if (storedReadStr) {
      const readIds = JSON.parse(storedReadStr);
      notifications = notifications.map(n => ({
        ...n,
        read: readIds.includes(n.id)
      }));
    }

    return notifications;
  } catch (error) {
    console.log("fetchFarmerNotifications error:", error);
    throw error;
  }
}

export async function markAsRead(id) {
  const storedReadStr = await AsyncStorage.getItem("read_notifications") || "[]";
  const readIds = JSON.parse(storedReadStr);
  if (!readIds.includes(id)) {
    readIds.push(id);
    await AsyncStorage.setItem("read_notifications", JSON.stringify(readIds));
  }
}

export async function markAllAsRead(notifications) {
  const ids = notifications.map(n => n.id);
  const storedReadStr = await AsyncStorage.getItem("read_notifications") || "[]";
  const readIds = JSON.parse(storedReadStr);
  const newReadIds = Array.from(new Set([...readIds, ...ids]));
  await AsyncStorage.setItem("read_notifications", JSON.stringify(newReadIds));
}
