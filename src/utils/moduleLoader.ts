import { readdirSync } from 'fs';
import { join } from 'path';

interface ModuleConstructor<T> {
  new (...args: any[]): T;
}

export async function loadModulesFromDirectory<T>(dirPath: string, ...args: any[]): Promise<T[]> {
  const modules: T[] = [];
  
  try {
    const absolutePath = join(process.cwd(), dirPath);
    const files = readdirSync(absolutePath).filter(file => 
      file.endsWith('.ts') || file.endsWith('.js')
    );
    
    for (const file of files) {
      try {
        const module = await import(join(absolutePath, file));
        const ModuleClass = module.default as ModuleConstructor<T>;
        
        if (typeof ModuleClass === 'function') {
          modules.push(new ModuleClass(...args));
        }
      } catch (error) {
        console.error(`Failed to load module from ${file}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error loading modules from ${dirPath}:`, error);
  }
  
  return modules;
} 