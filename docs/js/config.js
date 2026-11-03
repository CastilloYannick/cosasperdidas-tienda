/*
 * Ajustes de la tienda. Si SUPABASE_URL queda vacío, la tienda lee
 * data/productos.json (solo lectura) y el panel no puede guardar.
 */
window.CP_CONFIG = {
  SUPABASE_URL: 'https://rmtrqylnuolvtregepuq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_9Lz7Hviwnt1eBr5LjEIFwg_aXL25avr',
  BUCKET: 'fotos',
  INSTAGRAM_USUARIO: 'cosass.perdidas',
  MONEDA: 'Q',
  // En localhost la tienda usa data/productos.json para probar cambios sin tocar la base real
  LOCAL_EN_PRUEBA: true
};
