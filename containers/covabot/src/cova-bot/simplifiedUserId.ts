// Minimal userId mapping for CovaBot triggers without shared package dependency
// Use environment to ensure we never respond to Cova (the person)
const COVA_USER_ID = process.env.COVA_USER_ID || '139592376443338752';
export const userId = {
	Cova: COVA_USER_ID,
};
export default userId;
