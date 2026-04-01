export interface FavVet {
  id: string;
  name: string;
  address: string;
  phone: string;
}

const FAV_KEY = "meongcare_fav_vets";

export function getFavVets(): FavVet[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}

export function toggleFavVet(place: { id: string; place_name: string; road_address_name: string; address_name: string; phone: string }): FavVet[] {
  const favs = getFavVets();
  const idx = favs.findIndex((f) => f.id === place.id);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push({ id: place.id, name: place.place_name, address: place.road_address_name || place.address_name, phone: place.phone });
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  return favs;
}
