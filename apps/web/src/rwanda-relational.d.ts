declare module 'rwanda-relational' {
  type RwandaLocation = { id: number; name: string; parent_id?: number };

  type RwandaRelational = {
    provinces: (where?: { id?: number }) => RwandaLocation | RwandaLocation[];
    districts: (where?: { id?: number; parent_id?: number }) => RwandaLocation | RwandaLocation[];
    sectors: (where?: { id?: number; parent_id?: number }) => RwandaLocation | RwandaLocation[];
    cells: (where?: { id?: number; parent_id?: number }) => RwandaLocation | RwandaLocation[];
    villages: (where?: { id?: number; parent_id?: number }) => RwandaLocation | RwandaLocation[];
  };

  const rwanda: RwandaRelational;
  export default rwanda;
}
