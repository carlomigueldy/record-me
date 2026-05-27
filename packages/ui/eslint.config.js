import { reactConfig } from '@record-me/config/eslint';

export default [...reactConfig, { ignores: ['dist/**', 'node_modules/**', '.turbo/**'] }];
